import { CCTX } from "../types/trackCCTX.types";

/**
 * Create a shortened hash representation for better readability
 */
export const shortenHash = (hash: string): string => {
  if (!hash || hash.length === 0) {
    return "";
  }

  // For short hashes, just return the original
  if (hash.length <= 10) {
    return hash;
  }

  const start = hash.substring(0, 10);
  const end = hash.substring(hash.length - 8);
  return `${start}...${end}`;
};

/**
 * Format the status text with optional status message
 */
export const formatStatusText = (tx: CCTX): string => {
  if (!tx) return "";
  return `${tx.status || "Unknown"}${
    tx.status_message ? ` (${tx.status_message})` : ""
  }`;
};
