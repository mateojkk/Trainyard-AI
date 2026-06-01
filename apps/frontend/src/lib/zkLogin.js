import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { generateNonce, generateRandomness, getExtendedEphemeralPublicKey, getZkLoginSignature, genAddressSeed, decodeJwt, jwtToAddress } from "@mysten/sui/zklogin";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { authApi, zkproverApi } from "./api";
import { writeJson } from "./zkLoginStorage";

const PENDING_KEY = "trainyard.zklogin.pending";
const EPOCH_TTL = Number(import.meta.env.VITE_ZKLOGIN_EPOCH_TTL || 2);
const SUI_RPC_URL = import.meta.env.VITE_SUI_RPC_URL;
const PLATFORM_ADDRESS = import.meta.env.VITE_PLATFORM_ADDRESS || "";
const USDC_COIN_TYPE = import.meta.env.VITE_USDC_COIN_TYPE || "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";

const BN254_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
if (!SUI_RPC_URL) throw new Error("VITE_SUI_RPC_URL is not set");
const client = new SuiJsonRpcClient({ url: SUI_RPC_URL, network: "mainnet" });

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

export async function signAndExecuteTransaction(priceInUsdc) {
  const pending = loadPending();
  if (!pending) throw new Error("No zkLogin session found. Please sign in again.");
  const session = await authApi.me();
  if (!session.authenticated || !session.id_token) throw new Error("Not authenticated");
  const saltBigInt = BigInt("0x" + session.salt) % BN254_FIELD;
  const keypair = Ed25519Keypair.fromSecretKey(pending.secretKey);
  const decodedJwt = decodeJwt(session.id_token);
  const sender = jwtToAddress(session.id_token, saltBigInt, false);
  const priceInBaseUnits = BigInt(Math.round(priceInUsdc * 1_000_000));
  const tx = new Transaction();
  tx.setSender(sender);
  tx.setGasPrice(0);
  tx.moveCall({
    target: "0x2::balance::send_funds",
    typeArguments: [USDC_COIN_TYPE],
    arguments: [tx.balance({ type: USDC_COIN_TYPE, balance: priceInBaseUnits }), tx.pure.address(PLATFORM_ADDRESS)],
  });
  const { bytes, signature: userSignature } = await tx.sign({ client, signer: keypair });
  const partialZkLoginSignature = await zkproverApi.prove({
    jwt: session.id_token, maxEpoch: String(pending.maxEpoch),
    extendedEphemeralPublicKey: pending.extendedEphemeralPublicKey,
    jwtRandomness: pending.randomness, salt: "0x" + saltBigInt.toString(16),
  });
  const addressSeed = genAddressSeed(saltBigInt, "sub", decodedJwt.sub, decodedJwt.aud).toString();
  const zkLoginSignature = getZkLoginSignature({
    inputs: { ...partialZkLoginSignature, addressSeed },
    maxEpoch: Number(pending.maxEpoch), userSignature,
  });
  const result = await client.executeTransactionBlock({
    transactionBlock: bytes, signature: zkLoginSignature, options: { showEffects: true },
  });
  if (result.effects?.status?.status !== "success")
    throw new Error(`Transaction failed: ${result.effects?.status?.error || "Unknown error"}`);
  return result.digest;
}

async function getMaxEpoch() {
  const result = await Promise.race([
    client.getCommitteeInfo(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Sui RPC timeout")), 15000)),
  ]);
  if (!result || typeof result.epoch !== "string")
    throw new Error(`getCommitteeInfo returned unexpected result: ${JSON.stringify(result)}`);
  return Number(result.epoch) + EPOCH_TTL;
}

function loadPending() {
  try { const raw = window.sessionStorage.getItem(PENDING_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

function getReturnToPath() {
  return `${window.location.pathname}${window.location.search}`;
}
