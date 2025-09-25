import { QueryGetCctxResponseSDKType } from "@zetachain/sdk-cosmos/zetachain/zetacore/crosschain/query";
import axios, { AxiosRequestConfig, isAxiosError } from "axios";

import {
  InboundHashToCctxResponseReturnType,
  PendingNonce,
  PendingNoncesResponse,
  TssResponse,
} from "../types/trackCCTX.types";
import { handleError } from "./handleError";

/**
 * Generic API fetch function with error handling
 */
export const fetchFromApi = async <T>(
  api: string,
  endpoint: string,
  options: AxiosRequestConfig = {}
): Promise<T> => {
  const url = `${api}${endpoint}`;
  const defaultOptions: AxiosRequestConfig = {
    timeout: 10000,
    ...options,
  };

  const response = await axios.get<T>(url, defaultOptions);

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Fetch failed with status: ${response.status}`);
  }

  return response.data;
};

/**
 * Get cross-chain transaction by its hash
 */
export const getCctxByHash = async (
  api: string,
  hash: string
): Promise<QueryGetCctxResponseSDKType["CrossChainTx"] | undefined> => {
  try {
    const data = await fetchFromApi<QueryGetCctxResponseSDKType>(
      api,
      `/zeta-chain/crosschain/cctx/${hash}`
    );
    return data.CrossChainTx;
  } catch (error) {
    // Completely suppress 404/400 errors - these are expected during polling
    if (
      isAxiosError(error) &&
      (error.response?.status === 404 || error.response?.status === 400)
    ) {
      // Don't log anything - these are normal during polling
      return undefined;
    }

    // Only log unexpected errors
    handleError({ context: "Failed to fetch CCTX", error });
    return undefined;
  }
};

/**
 * Fetch CCTXs by inbound transaction hash
 */
export const getCctxByInboundHash = async (
  api: string,
  hash: string
): Promise<string[]> => {
  try {
    const data = await fetchFromApi<InboundHashToCctxResponseReturnType>(
      api,
      `/zeta-chain/crosschain/inTxHashToCctx/${hash}`
    );
    return data.inboundHashToCctx.cctx_index;
  } catch (error) {
    // Completely suppress 404 errors - these are expected during polling
    if (isAxiosError(error) && error.response?.status === 404) {
      // Don't log anything - these are normal during polling
      return [];
    }

    // Only log unexpected errors
    handleError({ context: "Failed to fetch CCTX by inbound hash", error });
    return [];
  }
};

/**
 * Fetch pending nonces for a specific TSS
 */
export const getPendingNoncesForTss = async (
  api: string,
  tss: string
): Promise<PendingNonce[]> => {
  try {
    const data = await fetchFromApi<PendingNoncesResponse>(
      api,
      `/zeta-chain/observer/pendingNonces`
    );
    return data.pending_nonces.filter((n) => n.tss === tss);
  } catch (error) {
    // Simplify error handling - just log all errors
    handleError({ context: "Failed to fetch pending nonces", error });
    return [];
  }
};

/**
 * Fetch TSS public key
 */
export const getTSS = async (api: string): Promise<string | undefined> => {
  try {
    const data = await fetchFromApi<TssResponse>(
      api,
      `/zeta-chain/observer/TSS`
    );
    return data.TSS.tss_pubkey;
  } catch (error) {
    handleError({ context: "Failed to fetch TSS", error });
    return undefined;
  }
};
