export function writeJson(key, value, storage = window.localStorage) {
  storage.setItem(key, JSON.stringify(value));
}
