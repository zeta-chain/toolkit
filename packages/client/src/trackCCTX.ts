import { CCTXs, Emitter } from "../../../types/trackCCTX.types";
import {
  getCctxByHash,
  getCctxByInboundHash,
  getTSS,
  handleError,
  pollTransactions,
  type TransactionState,
  validateTransactionHash,
} from "../../../utils";
import type { ZetaChainClient } from "./client";

/**
 * Main entry point for tracking cross-chain transactions
 */
export const trackCCTX = async function (
  this: ZetaChainClient,
  {
    hash,
    json = false,
    emitter = null,
    timeoutSeconds = 60,
  }: {
    emitter: Emitter | null;
    hash: string;
    json: boolean;
    timeoutSeconds?: number;
  }
): Promise<CCTXs> {
  if (timeoutSeconds <= 0) {
    throw new Error("timeoutSeconds must be a positive number");
  }

  // Validate transaction hash format
  if (!validateTransactionHash(hash)) {
    if (emitter) {
      emitter.emit("search-add", {
        text: "Invalid transaction hash format",
      });

      // Allow time for the UI to update before failing
      await new Promise((resolve) => setTimeout(resolve, 500));

      emitter.emit("search-fail", {
        text: "Invalid transaction hash format. Expected 0x followed by 64 hex characters",
      });
    }
    throw new Error(
      "Invalid transaction hash format. Expected 0x followed by 64 hex characters"
    );
  }

  // Get the API endpoint for the current network
  const apiEndpoint = this.getEndpoint("cosmos-http", `zeta_${this.network}`);

  // Get TSS public key
  const tss = await getTSS(apiEndpoint);

  if (!tss) {
    if (emitter) {
      emitter.emit("search-fail", {
        text: "TSS not found. Network may be unavailable",
      });
    }
    throw new Error("TSS not found");
  }

  // Do a quick check for transaction existence and network status
  if (emitter) {
    emitter.emit("search-add", {
      text: `Checking transaction... (${timeoutSeconds}s timeout)`,
    });
  }

  // Try a quick check to see if the transaction exists
  try {
    // Try to check transaction existence directly
    const directCheck = await getCctxByHash(apiEndpoint, hash);
    if (!directCheck) {
      // Try by inbound hash
      const inboundCheck = await getCctxByInboundHash(apiEndpoint, hash);
      if (inboundCheck.length === 0) {
        // Not found by either method, let the user know we'll keep looking
        if (emitter) {
          emitter.emit("search-update", {
            text: "Transaction not found immediately. Continuing to monitor...",
          });
        }
      }
    }
  } catch (error) {
    // Handle network errors and unexpected API errors
    if (emitter) {
      emitter.emit("search-update", {
        text: "Network error during initial check. Continuing to monitor...",
      });
    }
    // Log the error for debugging but don't fail the whole process
    handleError({
      context: "Error during initial transaction check",
      error,
    });
  }

  // Initialize state
  const initialState: TransactionState = {
    cctxs: {},
    pendingNonces: [],
    pollCount: 0,
    spinners: {},
  };

  let timeoutId: NodeJS.Timeout | null = null;

  // Create the polling promise
  const pollingPromise = new Promise<CCTXs>((resolve, reject) => {
    const intervalId = setInterval(() => {
      initialState.pollCount++;

      // Check for timeout after a reasonable number of attempts
      if (
        timeoutSeconds > 0 &&
        initialState.pollCount * 3 >= timeoutSeconds &&
        Object.keys(initialState.cctxs).length === 0
      ) {
        clearInterval(intervalId);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (emitter) {
          emitter.emit("search-fail", {
            text: `No transaction found after ${timeoutSeconds} seconds. Please verify the transaction hash.`,
          });
        }

        // Instead of rejecting, resolve with empty CCTXs to indicate timeout
        resolve({});
      }

      pollTransactions({
        api: apiEndpoint,
        emitter,
        hash,
        intervalId,
        json,
        reject,
        resolve,
        state: initialState,
        timeoutId,
        timeoutSeconds,
        tss,
      }).catch((error) => {
        clearInterval(intervalId);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        handleError({
          context: "Error in transaction tracking interval",
          error,
        });
        reject(new Error("Error in transaction tracking interval"));
      });
    }, 3000); // Poll API every 3 seconds

    // Set global timeout
    if (timeoutSeconds > 0) {
      timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        if (emitter) {
          emitter.emit("search-fail", {
            text: `Operation timed out after ${timeoutSeconds} seconds. No transaction found.`,
          });
        }
        // Instead of rejecting, resolve with empty CCTXs to indicate timeout
        resolve({});
      }, timeoutSeconds * 1000);
    }
  });

  return pollingPromise;
};
