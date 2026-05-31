const LOCAL_SALT_KEY = "trainyard.zklogin.localSalt";

export function writeJson(key, value, storage = window.localStorage) {
  storage.setItem(key, JSON.stringify(value));
}

export function getUserSalt(envSalt) {
  if (envSalt && envSalt !== "replace-with-stable-demo-salt") return envSalt;
  const storedSalt = window.localStorage.getItem(LOCAL_SALT_KEY);
  if (storedSalt) return storedSalt;
  const salt = crypto.getRandomValues(new BigUint64Array(2)).join("");
  window.localStorage.setItem(LOCAL_SALT_KEY, salt);
  return salt;
}
