import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { generateNonce, generateRandomness, getExtendedEphemeralPublicKey, getZkLoginSignature, genAddressSeed, decodeJwt, jwtToAddress } from "@mysten/sui/zklogin";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { Transaction } from "@mysten/sui/transactions";
import { authApi, zkproverApi } from "./api";
import { writeJson } from "./zkLoginStorage";

const PENDING_KEY = "trainyard.zklogin.pending";
const EPOCH_TTL = Number(import.meta.env.VITE_ZKLOGIN_EPOCH_TTL || 2);
const SUI_RPC_URL = import.meta.env.VITE_SUI_RPC_URL;
const PLATFORM_ADDRESS = import.meta.env.VITE_PLATFORM_ADDRESS || "";
const USDC_COIN_TYPE = import.meta.env.VITE_USDC_COIN_TYPE || "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";

const BN254_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

// SuiGraphQLClient is required for client.core (address balance resolution used
// by tx.balance() for gasless stablecoin transactions). SuiGrpcClient requires
// an explicit baseUrl and its binary transport doesn't work in browsers without one.
const GRAPHQL_URL = "https://graphql.mainnet.sui.io/graphql";
const client = new SuiGraphQLClient({ url: GRAPHQL_URL });

export async function beginZkLogin() {
  const keypair = Ed25519Keypair.generate();
  const randomness = generateRandomness();
  const maxEpoch = await getMaxEpoch();
  const nonce = generateNonce(keypair.getPublicKey(), maxEpoch, randomness);

  writeJson(PENDING_KEY, {
    nonce, randomness, maxEpoch,
    secretKey: keypair.getSecretKey(),
    extendedEphemeralPublicKey: getExtendedEphemeralPublicKey(keypair.getPublicKey()),
  }, window.sessionStorage);

  const { authorization_url } = await authApi.startGoogle({ nonce, return_to: getReturnToPath() });
  window.location.assign(authorization_url);
}

export async function hydrateZkLoginAccount() {
  const session = await authApi.me();
  if (!session.authenticated || !session.id_token) return null;
  const userSalt = BigInt("0x" + session.salt) % BN254_FIELD;
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
  const pending = loadPending();
  if (!pending) throw new Error("No zkLogin session found. Please sign in again.");
  const session = await authApi.me();
  if (!session.authenticated || !session.id_token) throw new Error("Not authenticated");
  const saltBigInt = BigInt("0x" + session.salt) % BN254_FIELD;
  const keypair = Ed25519Keypair.fromSecretKey(pending.secretKey);
  const decodedJwt = decodeJwt(session.id_token);
  const sender = jwtToAddress(session.id_token, saltBigInt, false);
  const priceInBaseUnits = BigInt(Math.round(priceInUsdc * 1_000_000));
  const commissionAmount = priceInBaseUnits * 5n / 100n;
  const sellerAmount = priceInBaseUnits - commissionAmount;

  // Pre-flight balance check via GraphQL core API
  try {
    const { balance } = await client.core.getBalance({ owner: sender, coinType: USDC_COIN_TYPE });
    const available = BigInt(balance.balance ?? 0);
    console.log("[zkLogin] Balance check:", { sender, available: available.toString(), priceInBaseUnits: priceInBaseUnits.toString(), sellerAmount: sellerAmount.toString(), commissionAmount: commissionAmount.toString(), addressBalance: balance.addressBalance, coinBalance: balance.coinBalance });
    if (available < priceInBaseUnits) throw new Error(`Insufficient USDC: have ${available}, need ${priceInBaseUnits}`);
  } catch (e) { if (e.message?.includes("Insufficient USDC")) throw e; console.warn("Balance pre-check failed, proceeding:", e.message); }

  // Create a proxy to bypass the GraphQL resolver and fall back to the offline/core resolver
  const offlineClient = new Proxy(client, {
    get(target, prop) {
      if (prop === "core") {
        return new Proxy(target.core, {
          get(coreTarget, coreProp) {
            if (coreProp === "resolveTransactionPlugin") return () => undefined;
            const value = Reflect.get(coreTarget, coreProp);
            return typeof value === "function" ? value.bind(coreTarget) : value;
          }
        });
      }
      const value = Reflect.get(target, prop);
      return typeof value === "function" ? value.bind(target) : value;
    }
  });

  // Build gasless stablecoin PTB using address balance intents.
  // Each tx.balance() call creates an independent withdrawal reservation;
  // the SDK resolves both via 0x2::balance::redeem_funds during signing.
  const tx = new Transaction();
  tx.setSender(sender);
  tx.setGasPrice(0);
  tx.setGasBudget(0);
  const sellerBalance = tx.balance({ type: USDC_COIN_TYPE, balance: sellerAmount });
  const commissionBalance = tx.balance({ type: USDC_COIN_TYPE, balance: commissionAmount });
  tx.moveCall({ target: "0x2::balance::send_funds", typeArguments: [USDC_COIN_TYPE], arguments: [sellerBalance, tx.pure.address(sellerAddress)] });
  tx.moveCall({ target: "0x2::balance::send_funds", typeArguments: [USDC_COIN_TYPE], arguments: [commissionBalance, tx.pure.address(PLATFORM_ADDRESS)] });
  
  // Build and print transaction data for debugging before signing
  await tx.build({ client: offlineClient });
  console.log("[zkLogin] Built transaction data:", {
    expiration: tx.getData().expiration,
    gasData: tx.getData().gasData,
    inputs: tx.getData().inputs,
  });

  let bytes, userSignature;
  ({ bytes, signature: userSignature } = await tx.sign({ client: offlineClient, signer: keypair }));
  const partialZkLoginSignature = await zkproverApi.prove({
    jwt: session.id_token, maxEpoch: String(pending.maxEpoch),
    extendedEphemeralPublicKey: pending.extendedEphemeralPublicKey,
    jwtRandomness: pending.randomness, salt: saltBigInt.toString(10),
  });
  const addressSeed = genAddressSeed(saltBigInt, "sub", decodedJwt.sub, decodedJwt.aud).toString();
  const zkLoginSignature = getZkLoginSignature({
    inputs: { ...partialZkLoginSignature, addressSeed },
    maxEpoch: Number(pending.maxEpoch), userSignature,
  });
  const result = await client.core.executeTransaction({
    transaction: bytes, signatures: [zkLoginSignature],
  });
  if (!result.status?.success)
    throw new Error(`Transaction failed: ${result.status?.error?.message || JSON.stringify(result.status?.error) || "Unknown error"}`);
  return result.digest;
}

async function getMaxEpoch() {
  const result = await Promise.race([
    client.core.getCurrentSystemState(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Sui RPC timeout")), 15000)),
  ]);
  const epoch = result?.systemState?.epoch;
  if (epoch === undefined || epoch === null)
    throw new Error(`getCurrentSystemState returned unexpected result: ${JSON.stringify(result)}`);
  return Number(epoch) + EPOCH_TTL;
}

function loadPending() {
  try { const raw = window.sessionStorage.getItem(PENDING_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

function getReturnToPath() {
  return `${window.location.pathname}${window.location.search}`;
}
