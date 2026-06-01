const WALRUS_AGGREGATOR = import.meta.env.VITE_WALRUS_AGGREGATOR || "https://aggregator.walrus-mainnet.walrus.space";

export async function fetchFromWalrus(blobId) {
  const url = `${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`;

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

export function getWalrusUrl(blobId) {
  return `${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`;
}

export async function fetchPreview(blobId) {
  const buffer = await fetchFromWalrus(blobId);
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(buffer);
}
