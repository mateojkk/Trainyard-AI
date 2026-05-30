const SESSION_KEY = "trainyard.zklogin.session";
const PENDING_KEY = "trainyard.zklogin.pending";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const CLIENT_ID = import.meta.env.VITE_ZKLOGIN_GOOGLE_CLIENT_ID || "";
const SALT = import.meta.env.VITE_ZKLOGIN_SALT || "1";
const MAX_EPOCH = Number(import.meta.env.VITE_ZKLOGIN_MAX_EPOCH || 10);

export function getStoredZkLoginAccount() {
  return readJson(SESSION_KEY)?.account || null;
}

export async function beginZkLogin() {
  if (!CLIENT_ID) {
    throw new Error("Missing VITE_ZKLOGIN_GOOGLE_CLIENT_ID.");
  }

  const { Ed25519Keypair } = await import("@mysten/sui/keypairs/ed25519");
  const { generateNonce, generateRandomness } = await import("@mysten/sui/zklogin");
  const keypair = Ed25519Keypair.generate();
  const randomness = generateRandomness();
  const nonce = generateNonce(keypair.getPublicKey(), MAX_EPOCH, randomness);

  writeSessionJson(PENDING_KEY, {
    randomness,
    maxEpoch: MAX_EPOCH,
    secretKey: keypair.getSecretKey(),
  });

  window.location.assign(buildGoogleUrl(nonce));
}

export async function consumeZkLoginRedirect() {
  const idToken = new URLSearchParams(window.location.hash.slice(1)).get("id_token");
  if (!idToken) return null;

  const { decodeJwt, jwtToAddress } = await import("@mysten/sui/zklogin");
  const jwt = decodeJwt(idToken);
  const account = {
    address: jwtToAddress(idToken, SALT, false),
    email: jwt.email || "",
    name: jwt.name || "zkLogin user",
    provider: "Google zkLogin",
  };

  writeJson(SESSION_KEY, { account });
  window.sessionStorage.setItem("trainyard.zklogin.jwt", idToken);
  window.sessionStorage.removeItem(PENDING_KEY);
  window.history.replaceState(null, "", window.location.pathname);
  return account;
}

export function clearZkLoginSession() {
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(PENDING_KEY);
  window.sessionStorage.removeItem("trainyard.zklogin.jwt");
}

function buildGoogleUrl(nonce) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: window.location.origin + window.location.pathname,
    response_type: "id_token",
    scope: "openid email profile",
    nonce,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

function readJson(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function writeSessionJson(key, value) {
  window.sessionStorage.setItem(key, JSON.stringify(value));
}
