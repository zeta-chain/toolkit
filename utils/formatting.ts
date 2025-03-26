import { CCTX } from "../types/trackCCTX.types";

/**
 * Create a shortened hash representation for better readability
 */
export const shortenHash = (hash: string): string => {
  // Special handling for short hashes
  if (hash.length <= 10) {
    return `${hash}...${hash.substring(2)}`;
  }

  const start = hash.substring(0, 10);
  const end = hash.substring(hash.length - 8);
  return `${start}...${end}`;
};

/**
 * Format the status text with optional status message
 */
export const formatStatusText = (tx: CCTX): string => {
  return `${tx.status}${tx.status_message ? ` (${tx.status_message})` : ""}`;
};
