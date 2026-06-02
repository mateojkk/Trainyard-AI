import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL;
const API_URL =
  import.meta.env.PROD && configuredApiUrl?.includes("localhost")
    ? "/api"
    : configuredApiUrl || "/api";

const API = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export const datasetsApi = {
  getList: async (category = "", search = "", page = 1, limit = 12) => {
    const params = { page, limit };
    if (category) params.category = category;
    if (search) params.search = search;
    const response = await API.get("/datasets", { params });
    return response.data;
  },
  getOne: async (id) => { const r = await API.get(`/datasets/${id}`); return r.data; },
  uploadBlob: async (encryptedBlob, fileName) => {
    const formData = new FormData();
    formData.append("file", encryptedBlob, fileName);
    const r = await API.post("/datasets/upload-blob", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    });
    return r.data;
  },
  uploadPreview: async (previewText) => {
    const formData = new FormData();
    formData.append("preview", previewText);
    const r = await API.post("/datasets/upload-preview", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return r.data;
  },
  createListing: async (listingData) => {
    const formData = new FormData();
    Object.entries(listingData).forEach(([key, value]) => formData.append(key, value));
    const r = await API.post("/datasets/create", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return r.data;
  },
  updatePrice: async (id, priceSui) => {
    const r = await API.patch(`/datasets/${e(id)}/price`, { price_sui: priceSui });
    return r.data;
  },
  syncSellerAddress: async (sellerAddress) => {
    const r = await API.post("/datasets/sync-seller-address", { seller_address: sellerAddress });
    return r.data;
  },
};

export const paymentsApi = {
  verify: async (datasetId, buyerAddress, txDigest, blobId) => {
    const r = await API.post("/payments/verify", {
      dataset_id: datasetId, buyer_address: buyerAddress,
      tx_digest: txDigest, blob_id: blobId,
    });
    return r.data;
  },
  getPurchased: async (buyerAddress = "") => {
    const r = await API.get("/payments/purchased", {
      params: buyerAddress ? { buyer_address: buyerAddress } : {},
    });
    return r.data;
  },
  access: async (datasetId, buyerAddress = "") => {
    const r = await API.get(`/payments/access/${e(datasetId)}`, {
      params: buyerAddress ? { buyer_address: buyerAddress } : {},
    });
    return r.data;
  },
};

export const aiApi = {
  describe: async (fileInfo) => { const r = await API.post("/ai/describe", fileInfo); return r.data; },
};

export const authApi = {
  startGoogle: async (payload) => { const r = await API.post("/auth/google/start", payload); return r.data; },
  me: async () => { const r = await API.get("/auth/me"); return r.data; },
  logout: async () => { const r = await API.post("/auth/logout", {}); return r.data; },
};

export const zkproverApi = {
  prove: async (params) => { const r = await API.post("/zkprover/prove", params); return r.data; },
};

const e = (s) => encodeURIComponent(s);

export const profilesApi = {
  getMyProfile: async () => { const r = await API.get("/profiles/me"); return r.data; },
  updateMyProfile: async (data) => { const r = await API.post("/profiles/me", data); return r.data; },
  getProfile: async (u) => { const r = await API.get(`/profiles/${e(u)}`); return r.data; },
  searchProfiles: async (q) => { const r = await API.get("/profiles/search", { params: { q } }); return r.data; },
  getProfileDatasets: async (u) => { const r = await API.get(`/profiles/${e(u)}/datasets`); return r.data; },
  follow: async (u) => { const r = await API.post(`/profiles/${e(u)}/follow`); return r.data; },
  unfollow: async (u) => { const r = await API.post(`/profiles/${e(u)}/unfollow`); return r.data; },
  getFollowers: async (u) => { const r = await API.get(`/profiles/${e(u)}/followers`); return r.data; },
  getFollowing: async (u) => { const r = await API.get(`/profiles/${e(u)}/following`); return r.data; },
  uploadAvatar: async (file) => {
    const fd = new FormData(); fd.append("file", file);
    const r = await API.post("/profiles/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } });
    return r.data;
  },
};

export const suiRpcApi = {
  getBalance: async (owner, coinType) => {
    const r = await API.post("/sui-rpc", {
      jsonrpc: "2.0", id: 1, method: "suix_getBalance",
      params: [owner, coinType],
    });
    return r.data;
  },
  getLatestEpoch: async () => {
    const r = await API.post("/sui-rpc", {
      jsonrpc: "2.0", id: 1, method: "suix_getCommitteeInfo",
      params: [],
    });
    return r.data;
  },
};

export default API;
