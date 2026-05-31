import { authApi } from "./api";
import { getUserSalt, writeJson } from "./zkLoginStorage";

const PENDING_KEY = "trainyard.zklogin.pending";
const ENV_USER_SALT = import.meta.env.VITE_ZKLOGIN_SALT || "";
const EPOCH_TTL = Number(import.meta.env.VITE_ZKLOGIN_EPOCH_TTL || 2);
const SUI_NETWORK = import.meta.env.VITE_SUI_NETWORK || "mainnet";
const SUI_RPC_URL = import.meta.env.VITE_SUI_RPC_URL || "https://fullnode.mainnet.sui.io:443";

export async function beginZkLogin() {
  const { Ed25519Keypair } = await import("@mysten/sui/keypairs/ed25519");
  const { generateNonce, generateRandomness, getExtendedEphemeralPublicKey } = await import("@mysten/sui/zklogin");
  const keypair = Ed25519Keypair.generate();
  const randomness = generateRandomness();
  const maxEpoch = await getMaxEpoch();
  const nonce = generateNonce(keypair.getPublicKey(), maxEpoch, randomness);

  writeJson(PENDING_KEY, {
    nonce,
    randomness,
    maxEpoch,
    secretKey: keypair.getSecretKey(),
    extendedEphemeralPublicKey: getExtendedEphemeralPublicKey(keypair.getPublicKey()),
  }, window.sessionStorage);

  const { authorization_url } = await authApi.startGoogle({
    nonce,
    return_to: getReturnToPath(),
  });

  window.location.assign(authorization_url);
}

export async function hydrateZkLoginAccount() {
  const session = await authApi.me();
  if (!session.authenticated || !session.id_token) {
    return null;
  }
  const { decodeJwt, jwtToAddress } = await import("@mysten/sui/zklogin");
  const jwt = decodeJwt(session.id_token);
  const userSalt = getUserSalt(ENV_USER_SALT);

  const account = {
    address: jwtToAddress(session.id_token, userSalt, false),
    email: session.account?.email || jwt.email || "",
    name: session.account?.name || jwt.name || "zkLogin user",
    provider: "Google zkLogin",
    maxEpoch: session.account?.maxEpoch || undefined,
  };
  return account;
}

export function clearZkLoginSession() {
  authApi.logout().catch(() => {});
  window.sessionStorage.removeItem(PENDING_KEY);
}

async function getMaxEpoch() {
  const { SuiJsonRpcClient } = await import("@mysten/sui/jsonRpc");
  const client = new SuiJsonRpcClient({ url: SUI_RPC_URL, network: SUI_NETWORK });
  const systemState = await client.getLatestSuiSystemState();
  return Number(systemState.epoch) + EPOCH_TTL;
}

function getReturnToPath() {
  return `${window.location.pathname}${window.location.search}`;
}
