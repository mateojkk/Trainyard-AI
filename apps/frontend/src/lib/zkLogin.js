import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { generateNonce, generateRandomness, getExtendedEphemeralPublicKey, getZkLoginSignature, genAddressSeed, decodeJwt, jwtToAddress } from "@mysten/sui/zklogin";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { authApi, zkproverApi, suiRpcApi } from "./api";
import { writeJson } from "./zkLoginStorage";

const PENDING_KEY = "trainyard.zklogin.pending";
const EPOCH_TTL = Number(import.meta.env.VITE_ZKLOGIN_EPOCH_TTL || 2);
const SUI_RPC_URL = import.meta.env.VITE_SUI_RPC_URL;
const PLATFORM_ADDRESS = import.meta.env.VITE_PLATFORM_ADDRESS || "";
const USDC_COIN_TYPE = import.meta.env.VITE_USDC_COIN_TYPE || "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";
const USDC_DECIMALS = 6;
const MIN_GASLESS_TRANSFER_UNITS = 10_000n; // 0.01 USDC

// zkLogin requires salt < 2^128. Existing salts may be 256-bit hex; mask to 128 bits.
const SALT_MASK = (1n << 128n) - 1n;

// SuiGrpcClient hits the fullnode directly via gRPC-web, which handles gasless
// stablecoin detection natively during simulateTransaction.
const client = new SuiGrpcClient({ baseUrl: "https://fullnode.mainnet.sui.io:443", network: "mainnet" });

export async function beginZkLogin(customReturnTo) {
  const keypair = Ed25519Keypair.generate();
  const randomness = generateRandomness();
  const maxEpoch = await getMaxEpoch();
  const nonce = generateNonce(keypair.getPublicKey(), maxEpoch, randomness);

  writeJson(PENDING_KEY, {
    nonce, randomness, maxEpoch,
    secretKey: keypair.getSecretKey(),
    extendedEphemeralPublicKey: getExtendedEphemeralPublicKey(keypair.getPublicKey()),
  }, window.sessionStorage);

  const returnTo = customReturnTo || getReturnToPath();
  const { authorization_url } = await authApi.startGoogle({ nonce, return_to: returnTo });
  window.location.assign(authorization_url);
}

export async function hydrateZkLoginAccount() {
  const session = await authApi.me();
  if (!session.authenticated || !session.id_token) return null;
  const userSalt = BigInt("0x" + session.salt) & SALT_MASK;
  const jwt = decodeJwt(session.id_token);
  return {
    address: jwtToAddress(session.id_token, userSalt, false),
    sub: session.account?.sub || jwt.sub || "",
    email: session.account?.email || jwt.email || "",
    name: session.account?.name || jwt.name || "zkLogin user",
    picture: session.account?.picture || "",
    provider: "Google zkLogin",
    maxEpoch: session.account?.maxEpoch || undefined,
    jwt: session.id_token, salt: session.salt,
  };
}

export function clearZkLoginSession() {
  authApi.logout().catch(() => {});
  window.sessionStorage.removeItem(PENDING_KEY);
}

export async function signAndExecuteTransaction(priceInUsdc, sellerAddress) {
  const auth = await loadZkLoginSigningContext();
  const sender = auth.sender;
  const priceInBaseUnits = toUsdcBaseUnits(priceInUsdc);
  const commissionAmount = priceInBaseUnits * 5n / 100n;
  const sellerAmount = priceInBaseUnits - commissionAmount;
  if (sellerAmount < MIN_GASLESS_TRANSFER_UNITS || commissionAmount < MIN_GASLESS_TRANSFER_UNITS) {
    throw new Error("Gasless USDC purchases require each transfer leg to be at least 0.01 USDC. Minimum listing price is 0.20 USDC.");
  }

  // Pre-flight balance check via gRPC core API
  try {
    const { balance } = await client.core.getBalance({ owner: sender, coinType: USDC_COIN_TYPE });
    const available = BigInt(balance.balance ?? 0);
    console.log("[zkLogin] Balance check:", {
      sender,
      totalAvailable: available.toString(),
      addressBalance: balance.addressBalance,
      coinBalance: balance.coinBalance,
      priceInBaseUnits: priceInBaseUnits.toString(),
      sellerAmount: sellerAmount.toString(),
      commissionAmount: commissionAmount.toString(),
    });
    if (available < priceInBaseUnits) {
      const haveDec = (Number(available) / 1_000_000).toFixed(2);
      const needDec = (Number(priceInBaseUnits) / 1_000_000).toFixed(2);
      throw new Error(`Insufficient USDC: have ${haveDec}, need ${needDec}`);
    }
  } catch (e) { if (e.message?.includes("Insufficient USDC")) throw e; console.warn("Balance pre-check failed, proceeding:", e.message); }

  // Build gasless stablecoin PTB using address balance intents.
  // tx.balance() creates CoinWithBalance intents that the intent resolver
  // resolves during prepareForSerialization. For gasless eligibility it must
  // take Path 1 (all balance output, addressBalance >= required).
  const tx = new Transaction();
  tx.setSender(sender);

  // 1. Seller payment
  const sellerBalance = tx.balance({ balance: sellerAmount, type: USDC_COIN_TYPE });
  tx.moveCall({
    target: "0x2::balance::send_funds",
    typeArguments: [USDC_COIN_TYPE],
    arguments: [sellerBalance, tx.pure.address(sellerAddress)],
  });

  // 2. Platform commission payment
  const commissionBalance = tx.balance({ balance: commissionAmount, type: USDC_COIN_TYPE });
  tx.moveCall({
    target: "0x2::balance::send_funds",
    typeArguments: [USDC_COIN_TYPE],
    arguments: [commissionBalance, tx.pure.address(PLATFORM_ADDRESS)],
  });

  // Gasless stablecoin eligibility requires zero gas and no gas payment.
  tx.setGasPrice(0);
  tx.setGasBudget(0n);
  tx.setGasPayment([]);
  await setGaslessExpiration(tx);

  // Let the SDK resolve tx.balance() into FundsWithdrawal + send_funds calls and
  // serialize the normalized BCS shape. Manual BCS assembly leaks SDK-internal
  // JSON shapes into the low-level serializer.
  const txBytes = await tx.build({ client });
  const data = tx.getData();
  console.log("[zkLogin] Resolved commands:", data.commands.map((c) => {
    if (c.$kind !== "MoveCall") return c.$kind;
    const pkg = c.MoveCall.package.replace("0x", "").replace(/^0+/, "");
    return `0x${pkg}::${c.MoveCall.module}::${c.MoveCall.function}`;
  }));
  console.log("[zkLogin] Built transaction data (gasless):", {
    expiration: data.expiration,
    gasData: { ...data.gasData },
  });

  return executeZkLoginTransaction(txBytes, auth);
}

export async function transferUsdcFromZkLogin(recipientAddress, amountInUsdc) {
  const auth = await loadZkLoginSigningContext();
  const amountInBaseUnits = toUsdcBaseUnits(amountInUsdc);
  if (amountInBaseUnits < MIN_GASLESS_TRANSFER_UNITS) {
    throw new Error("Gasless USDC transfers must be at least 0.01 USDC.");
  }

  const { balance } = await client.core.getBalance({ owner: auth.sender, coinType: USDC_COIN_TYPE });
  const available = BigInt(balance.balance ?? 0);
  if (available < amountInBaseUnits) {
    const haveDec = (Number(available) / 1_000_000).toFixed(2);
    const needDec = (Number(amountInBaseUnits) / 1_000_000).toFixed(2);
    throw new Error(`Insufficient USDC: have ${haveDec}, need ${needDec}`);
  }

  const tx = new Transaction();
  tx.setSender(auth.sender);
  const transferBalance = tx.balance({ balance: amountInBaseUnits, type: USDC_COIN_TYPE });
  tx.moveCall({
    target: "0x2::balance::send_funds",
    typeArguments: [USDC_COIN_TYPE],
    arguments: [transferBalance, tx.pure.address(recipientAddress)],
  });
  tx.setGasPrice(0);
  tx.setGasBudget(0n);
  tx.setGasPayment([]);
  await setGaslessExpiration(tx);

  const txBytes = await tx.build({ client });
  console.log("[zkLogin] Built USDC transfer transaction:", {
    sender: auth.sender,
    recipientAddress,
    amountInBaseUnits: amountInBaseUnits.toString(),
    gasData: { ...tx.getData().gasData },
    expiration: tx.getData().expiration,
  });

  return executeZkLoginTransaction(txBytes, auth);
}

async function loadZkLoginSigningContext() {
  const pending = loadPending();
  if (!pending) throw new Error("No zkLogin session found. Please sign in again.");
  const session = await authApi.me();
  if (!session.authenticated || !session.id_token) throw new Error("Not authenticated");
  const saltBigInt = BigInt("0x" + session.salt) & SALT_MASK;
  const keypair = Ed25519Keypair.fromSecretKey(pending.secretKey);
  const decodedJwt = decodeJwt(session.id_token);
  await assertZkLoginSessionFresh(pending, decodedJwt);
  const sender = jwtToAddress(session.id_token, saltBigInt, false);
  return { pending, session, saltBigInt, keypair, decodedJwt, sender };
}

async function assertZkLoginSessionFresh(pending, decodedJwt) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const jwtExpiresAt = Number(decodedJwt.exp || 0);
  if (!jwtExpiresAt || jwtExpiresAt <= nowSeconds + 60) {
    throw new Error("Your zkLogin authorization expired. Please sign in again, then retry the USDC transfer.");
  }

  const { systemState } = await client.core.getCurrentSystemState();
  const currentEpoch = BigInt(systemState.epoch);
  const maxEpoch = BigInt(pending.maxEpoch);
  if (currentEpoch > maxEpoch) {
    throw new Error("Your zkLogin transaction session expired. Please sign in again, then retry.");
  }
}

async function executeZkLoginTransaction(txBytes, auth) {
  const { pending, session, saltBigInt, keypair, decodedJwt } = auth;
  const { signature: userSignature } = await keypair.signTransaction(txBytes);
  console.log("[zkLogin] Prover request payload:", {
    maxEpoch: String(pending.maxEpoch),
    extendedEphemeralPublicKey: pending.extendedEphemeralPublicKey,
    jwtRandomness: pending.randomness,
    salt: saltBigInt.toString(10),
  });

  const partialZkLoginSignature = await zkproverApi.prove({
    jwt: session.id_token, maxEpoch: String(pending.maxEpoch),
    extendedEphemeralPublicKey: pending.extendedEphemeralPublicKey,
    jwtRandomness: pending.randomness, salt: saltBigInt.toString(10),
  });
  console.log("[zkLogin] Prover raw response:", JSON.stringify(partialZkLoginSignature));
  const addressSeed = genAddressSeed(saltBigInt, "sub", decodedJwt.sub, decodedJwt.aud).toString();
  
  const mappedInputs = {
    proofPoints: {
      a: partialZkLoginSignature.zkProof.proofPoints.a,
      b: partialZkLoginSignature.zkProof.proofPoints.b,
      c: partialZkLoginSignature.zkProof.proofPoints.c,
    },
    issBase64Details: {
      value: partialZkLoginSignature.zkProof.issBase64Details.value,
      indexMod4: partialZkLoginSignature.zkProof.issBase64Details.indexMod4 ?? partialZkLoginSignature.zkProof.issBase64Details.indexModulusZero ?? 0,
    },
    headerBase64: partialZkLoginSignature.zkProof.headerBase64,
    addressSeed,
  };

  const zkLoginSignature = getZkLoginSignature({
    inputs: mappedInputs,
    maxEpoch: Number(pending.maxEpoch),
    userSignature,
  });
  const result = await client.core.executeTransaction({
    transaction: txBytes, signatures: [zkLoginSignature],
    include: { effects: true, balanceChanges: true },
  });
  console.log("[zkLogin] Transaction execution result:", JSON.stringify(result));
  
  const submittedTx = result?.Transaction ?? result?.FailedTransaction;
  if (!submittedTx) throw new Error("Transaction failed: No execution data returned");
  if (!submittedTx.status?.success) {
    const errorMsg = submittedTx.status?.error?.message || JSON.stringify(submittedTx.status?.error) || "Unknown error";
    throw new Error(`Transaction failed: ${errorMsg}`);
  }
  return submittedTx.digest;
}

async function getMaxEpoch() {
  const result = await Promise.race([
    suiRpcApi.getLatestEpoch(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Sui RPC timeout")), 15000)),
  ]);
  const epoch = result?.result?.epoch;
  if (epoch === undefined || epoch === null)
    throw new Error(`getLatestEpoch returned unexpected result: ${JSON.stringify(result)}`);
  return Number(epoch) + EPOCH_TTL;
}

function loadPending() {
  try { const raw = window.sessionStorage.getItem(PENDING_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

export function hasPendingZkLoginSession() {
  return !!loadPending();
}

function getReturnToPath() {
  return `${window.location.pathname}${window.location.search}`;
}

function toUsdcBaseUnits(amount) {
  const [wholeRaw, fractionRaw = ""] = String(amount).trim().split(".");
  const whole = wholeRaw || "0";
  const fraction = fractionRaw.padEnd(USDC_DECIMALS, "0").slice(0, USDC_DECIMALS);
  if (!/^\d+$/.test(whole) || !/^\d+$/.test(fraction)) {
    throw new Error("Invalid USDC amount.");
  }
  return BigInt(whole) * 1_000_000n + BigInt(fraction);
}

async function setGaslessExpiration(tx) {
  const [chainIdRes, systemStateRes] = await Promise.all([
    client.core.getChainIdentifier(),
    client.core.getCurrentSystemState(),
  ]);
  const epoch = BigInt(systemStateRes.systemState.epoch);

  tx.setExpiration({
    ValidDuring: {
      minEpoch: String(epoch),
      maxEpoch: String(epoch + 1n),
      minTimestamp: null,
      maxTimestamp: null,
      chain: chainIdRes.chainIdentifier,
      nonce: (Math.random() * 0x100000000) >>> 0,
    },
  });
}
