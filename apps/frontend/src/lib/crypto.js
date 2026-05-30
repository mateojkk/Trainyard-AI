/**
 * Utility functions for client-side encryption and decryption using the Web Crypto API.
 * Uses AES-256-GCM. No external dependencies.
 */

/**
 * Converts a Uint8Array or ArrayBuffer to a Base64 string.
 * @param {ArrayBuffer|Uint8Array} bytes 
 * @returns {string} Base64 string
 */
export function bytesToBase64(bytes) {
  const binString = Array.from(new Uint8Array(bytes), (x) => String.fromCharCode(x)).join("");
  return btoa(binString);
}

/**
 * Converts a Base64 string to a Uint8Array.
 * @param {string} base64 
 * @returns {Uint8Array} Uint8Array
 */
export function base64ToBytes(base64) {
  const binString = atob(base64);
  return Uint8Array.from(binString, (m) => m.charCodeAt(0));
}

/**
 * Generates a random 256-bit AES-GCM CryptoKey and exports it as a Base64 string.
 * @returns {Promise<{cryptoKey: CryptoKey, keyBase64: string}>}
 */
export async function generateKey() {
  const cryptoKey = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );

  const exported = await window.crypto.subtle.exportKey("raw", cryptoKey);
  const keyBase64 = bytesToBase64(exported);

  return { cryptoKey, keyBase64 };
}

/**
 * Encrypts a File or Blob with a Base64-encoded AES key.
 * Generates a random 12-byte IV.
 * @param {File|Blob} file The file to encrypt
 * @param {string} keyBase64 The Base64 key
 * @returns {Promise<{encryptedBlob: Blob, iv: string}>}
 */
export async function encryptFile(file, keyBase64) {
  // Import key
  const rawKey = base64ToBytes(keyBase64);
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false, // not extractable
    ["encrypt"]
  );

  // Generate 12-byte IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Read file as ArrayBuffer
  const fileBuffer = await file.arrayBuffer();

  // Encrypt with AES-GCM
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    cryptoKey,
    fileBuffer
  );

  const encryptedBlob = new Blob([encryptedBuffer], { type: "application/octet-stream" });
  const ivBase64 = bytesToBase64(iv);

  return { encryptedBlob, iv: ivBase64 };
}

/**
 * Decrypts an encrypted ArrayBuffer with a Base64-encoded AES key and IV.
 * @param {ArrayBuffer} encryptedArrayBuffer The encrypted buffer
 * @param {string} keyBase64 The Base64 key
 * @param {string} ivBase64 The Base64 IV
 * @returns {Promise<Blob>} Decrypted Blob
 */
export async function decryptBlob(encryptedArrayBuffer, keyBase64, ivBase64) {
  // Import key
  const rawKey = base64ToBytes(keyBase64);
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const iv = base64ToBytes(ivBase64);

  // Decrypt with AES-GCM
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    cryptoKey,
    encryptedArrayBuffer
  );

  return new Blob([decryptedBuffer], { type: "application/octet-stream" });
}
