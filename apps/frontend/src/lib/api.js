import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL;
const API_URL =
  import.meta.env.PROD && configuredApiUrl?.includes("localhost")
    ? "/api"
    : configuredApiUrl || "/api";

const API = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const datasetsApi = {
  /**
   * Fetches paginated datasets with optional category and search filters.
   */
  getList: async (category = "", search = "", page = 1, limit = 12) => {
    const params = { page, limit };
    if (category) params.category = category;
    if (search) params.search = search;
    const response = await API.get("/datasets", { params });
    return response.data;
  },

  /**
   * Fetches a single dataset details by its ID.
   */
  getOne: async (id) => {
    const response = await API.get(`/datasets/${id}`);
    return response.data;
  },

  /**
   * Uploads an encrypted file (Blob) to the server.
   */
  uploadBlob: async (encryptedBlob, fileName) => {
    const formData = new FormData();
    formData.append("file", encryptedBlob, fileName);
    const response = await API.post("/datasets/upload-blob", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 120000, // Large timeout for file uploads
    });
    return response.data;
  },

  /**
   * Uploads the plaintext preview text of a dataset.
   */
  uploadPreview: async (previewText) => {
    const formData = new FormData();
    formData.append("preview", previewText);
    const response = await API.post("/datasets/upload-preview", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  /**
   * Creates a dataset listing entry in the database.
   */
  createListing: async (listingData) => {
    const formData = new FormData();
    Object.entries(listingData).forEach(([key, value]) => {
      formData.append(key, value);
    });
    const response = await API.post("/datasets/create", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};

export const paymentsApi = {
  /**
   * Verifies the Sui USDC transaction digest and retrieves the dataset decryption key.
   */
  verify: async (datasetId, buyerAddress, txDigest, blobId) => {
    const response = await API.post("/payments/verify", {
      dataset_id: datasetId,
      buyer_address: buyerAddress,
      tx_digest: txDigest,
      blob_id: blobId,
    });
    return response.data;
  },
};

export const aiApi = {
  /**
   * Auto-describes a dataset based on filename and preview text.
   */
  describe: async (fileInfo) => {
    const response = await API.post("/ai/describe", fileInfo);
    return response.data;
  },
};

export default API;
