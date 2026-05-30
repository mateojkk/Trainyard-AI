const WALRUS_AGGREGATOR = import.meta.env.VITE_WALRUS_AGGREGATOR || "https://aggregator.walrus-mainnet.walrus.space";
const configuredApiUrl = import.meta.env.VITE_API_URL;
const API_URL =
  import.meta.env.PROD && configuredApiUrl?.includes("localhost")
    ? "/api"
    : configuredApiUrl || "/api";

/**
 * Fetches raw bytes (ArrayBuffer) for a given blob ID.
 * If the blob ID starts with 'mock-', requests it from the backend mock storage.
 * Otherwise, pulls it from the public Walrus aggregator.
 * @param {string} blobId 
 * @returns {Promise<ArrayBuffer>}
 */
export async function fetchFromWalrus(blobId) {
  let url = `${WALRUS_AGGREGATOR}/v1/${blobId}`;
  
  if (blobId.startsWith("mock-")) {
    url = `${API_URL}/datasets/mock-blob/${blobId}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob ${blobId} (status: ${response.status})`);
    }
    return await response.arrayBuffer();
  } catch (error) {
    console.error(`Error fetching from Walrus: ${error.message}`);
    throw error;
  }
}

/**
 * Returns the aggregator explorer URL for a given blob.
 * @param {string} blobId 
 * @returns {string}
 */
export function getWalrusUrl(blobId) {
  if (blobId.startsWith("mock-")) {
    return `${API_URL}/datasets/mock-blob/${blobId}`;
  }
  return `${WALRUS_AGGREGATOR}/v1/${blobId}`;
}

/**
 * Fetches preview text for a given preview blob ID.
 * @param {string} blobId 
 * @returns {Promise<string>}
 */
export async function fetchPreview(blobId) {
  const buffer = await fetchFromWalrus(blobId);
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(buffer);
}
