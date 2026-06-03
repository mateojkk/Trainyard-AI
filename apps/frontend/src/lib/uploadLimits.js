const TEN_GB_BYTES = 10 * 1024 * 1024 * 1024;
const VERCEL_FUNCTION_SAFE_BYTES = 4 * 1024 * 1024;

const parsePositiveInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const configuredMaxBytes = parsePositiveInteger(import.meta.env.VITE_MAX_UPLOAD_BYTES);
const configuredApiUrl = import.meta.env.VITE_API_URL;
const apiUrl =
  import.meta.env.PROD && configuredApiUrl?.includes("localhost")
    ? "/api"
    : configuredApiUrl || "/api";

const isLikelyVercelApi = import.meta.env.PROD && apiUrl === "/api";

export const MAX_UPLOAD_BYTES =
  configuredMaxBytes || (isLikelyVercelApi ? VERCEL_FUNCTION_SAFE_BYTES : TEN_GB_BYTES);

const formatUploadLimit = (bytes) => {
  if (bytes % (1024 * 1024 * 1024) === 0) return `${bytes / (1024 * 1024 * 1024)}GB`;
  if (bytes % (1024 * 1024) === 0) return `${bytes / (1024 * 1024)}MB`;
  return `${bytes} bytes`;
};

export const MAX_UPLOAD_LABEL = formatUploadLimit(MAX_UPLOAD_BYTES);

export const UPLOAD_LIMIT_HELP =
  isLikelyVercelApi && !configuredMaxBytes
    ? "This Vercel deployment cannot accept larger files through serverless API routes. Direct browser-to-Walrus upload is required for larger sponsored uploads."
    : null;
