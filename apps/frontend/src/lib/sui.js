/**
 * Formats a Sui wallet address for display (e.g. 0x1234...5678)
 * @param {string} address 
 * @returns {string} Truncated address
 */
export function truncateAddress(address) {
  if (!address) return "";
  const clean = address.startsWith("0x") ? address : `0x${address}`;
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

/**
 * Converts MIST (Sui's smallest unit, 10^-9) to SUI
 * @param {number|string} mist 
 * @returns {number} SUI value
 */
export function mistToSui(mist) {
  if (!mist) return 0;
  return Number(mist) / 1_000_000_000;
}

/**
 * Converts SUI to MIST
 * @param {number|string} sui 
 * @returns {bigint} MIST value
 */
export function suiToMist(sui) {
  if (!sui) return 0n;
  return BigInt(Math.round(Number(sui) * 1_000_000_000));
}

/**
 * Formats bytes to human-readable size (e.g. 2.4 MB)
 * @param {number} bytes 
 * @returns {string} Formatted file size
 */
export function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
