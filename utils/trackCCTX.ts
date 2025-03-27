import {
  CCTXs,
  Emitter,
  PendingNonce,
  Spinners,
} from "../types/trackCCTX.types";
import {
  getCctxByHash,
  getCctxByInboundHash,
  getPendingNoncesForTss,
} from "./api";
import { shortenHash } from "./formatting";
import {
  checkCompletionStatus,
  processNewCctxHashes,
  updateEmitter,
  updateTransactionStatus,
} from "./transactions";

export interface TransactionState {
  cctxs: CCTXs;
  pendingNonces: PendingNonce[];
  pollCount: number;
  spinners: Spinners;
}

export interface PollTransactionsArgs {
  api: string;
  emitter: Emitter | null;
  hash: string;
  intervalId?: NodeJS.Timeout;
  json: boolean;
  reject: (error: Error) => void;
  resolve: (cctxs: CCTXs) => void;
  state: TransactionState;
  timeoutId?: NodeJS.Timeout | null;
  timeoutSeconds: number;
  tss: string;
}

export interface ProcessTransactionUpdateArgs {
  api: string;
  emitter: Emitter | null;
  hash: string;
  json: boolean;
  state: TransactionState;
}

export interface UpdateTransactionStateArgs {
  api: string;
  emitter: Emitter | null;
  json: boolean;
  state: TransactionState;
  txHash: string;
}

/**
 * Update state immutably with type safety
 */
export const updateState = (
  state: TransactionState,
  update: Partial<TransactionState>
): TransactionState => ({
  ...state,
  ...update,
});

/**
 * Process a transaction update and return new state
 */
export const processTransactionUpdate = async ({
  state,
  hash,
  api,
  emitter,
  json,
}: ProcessTransactionUpdateArgs): Promise<TransactionState> => {
  // Validate state before proceeding
  if (!validateState(state)) {
    return state;
  }

  let cctxHashes: string[] = [];
  try {
    cctxHashes = await getCctxByInboundHash(api, hash);
  } catch {
    cctxHashes = [];
  }

  const result = processNewCctxHashes(
    cctxHashes,
    state.cctxs,
    state.spinners,
    emitter,
    json
  );

  return updateState(state, {
    cctxs: result.cctxs,
    spinners: result.spinners,
  });
};

/**
 * Update transaction status and return new state
 */
export const updateTransactionState = async ({
  state,
  txHash,
  api,
  emitter,
  json,
}: UpdateTransactionStateArgs): Promise<TransactionState> => {
  let tx;
  try {
    tx = await updateTransactionStatus(api, txHash, state.cctxs);
  } catch {
    return state;
  }

  if (!tx) return state;

  const updatedCctxs = {
    ...state.cctxs,
    [txHash]: [...(state.cctxs[txHash] || []), tx],
  };

  const updatedSpinners = updateEmitter(
    txHash,
    tx,
    updatedCctxs,
    state.spinners,
    state.pendingNonces,
    emitter,
    json
  );

  return updateState(state, {
    cctxs: updatedCctxs,
    spinners: updatedSpinners,
  });
};

/**
 * Validate state structure
 */
export const validateState = (state: TransactionState): boolean => {
  // Check for null or undefined state
  if (!state) {
    return false;
  }

  // Ensure cctxs and spinners are objects and not null
  if (
    !state.cctxs ||
    typeof state.cctxs !== "object" ||
    !state.spinners ||
    typeof state.spinners !== "object"
  ) {
    return false;
  }

  // Ensure pendingNonces is an array and not null
  if (!state.pendingNonces || !Array.isArray(state.pendingNonces)) {
    return false;
  }

  // Ensure pollCount is a number and not null
  if (typeof state.pollCount !== "number") {
    return false;
  }

  return true;
};

/**
 * Main polling function for transaction updates
 */
export const pollTransactions = async ({
  api,
  hash,
  tss,
  state,
  emitter,
  json,
  timeoutSeconds,
  resolve,
  reject,
  intervalId,
  timeoutId,
}: PollTransactionsArgs): Promise<void> => {
  // Calculate remaining time for display purposes
  const elapsedSeconds = Math.min(state.pollCount * 3, timeoutSeconds);
  const remainingSeconds = Math.max(0, timeoutSeconds - elapsedSeconds);

  // Update search spinner with timeout information
  if (!json && emitter && state.spinners["search"]) {
    emitter.emit("search-update", {
      text: `Searching for transaction... (${remainingSeconds}s remaining)`,
    });
  }

  // Update pending nonces
  let pendingNonces: PendingNonce[] = [];
  try {
    pendingNonces = await getPendingNoncesForTss(api, tss);
  } catch {
    pendingNonces = [];
  }
  let newState = updateState(state, { pendingNonces });

  // Find transactions if we don't have any yet
  if (Object.keys(newState.cctxs).length === 0) {
    if (!json && emitter && !newState.spinners["search"]) {
      const initialRemaining = Math.max(
        0,
        timeoutSeconds - state.pollCount * 3
      );
      emitter.emit("search-add", {
        text: `Searching for transaction... (${initialRemaining}s remaining)`,
      });
      newState = updateState(newState, {
        spinners: { ...newState.spinners, search: true },
      });
    }

    // Try to find by inbound hash
    newState = await processTransactionUpdate({
      api,
      emitter,
      hash,
      json,
      state: newState,
    });

    // If we didn't find any, try direct lookup
    if (Object.keys(newState.cctxs).length === 0) {
      let cctx;
      try {
        cctx = await getCctxByHash(api, hash);
      } catch {
        cctx = undefined;
      }

      if (cctx && !newState.cctxs[hash]) {
        const updatedCctxs = { ...newState.cctxs, [hash]: [] };
        const updatedSpinners = { ...newState.spinners };

        if (!updatedSpinners[hash] && !json && emitter) {
          const shortHash = shortenHash(hash);
          emitter.emit("add", { hash, text: `Transaction: ${shortHash}` });
          updatedSpinners[hash] = true;
        }

        newState = updateState(newState, {
          cctxs: updatedCctxs,
          spinners: updatedSpinners,
        });
      }
    }
  }

  // Check for additional CCTXs by looking at all inbound hashes
  for (const txHash in newState.cctxs) {
    newState = await processTransactionUpdate({
      api,
      emitter,
      hash: txHash,
      json,
      state: newState,
    });
  }

  // Update transaction statuses
  if (Object.keys(newState.cctxs).length > 0) {
    if (newState.spinners["search"] && !json && emitter) {
      emitter.emit("search-end", {
        text: "Transaction found",
      });
      newState = updateState(newState, {
        spinners: { ...newState.spinners, search: false },
      });
    }

    // Update all tracked transactions
    for (const txHash in newState.cctxs) {
      newState = await updateTransactionState({
        api,
        emitter,
        json,
        state: newState,
        txHash,
      });
    }
  }

  // Validate state before proceeding
  if (!validateState(newState)) {
    reject(new Error("Invalid state detected during polling"));
  }

  // Check if we're done tracking
  const { isComplete, isSuccessful } = checkCompletionStatus(
    newState.cctxs,
    emitter,
    json
  );

  if (isComplete) {
    if (isSuccessful) {
      // Clear timers before resolving to prevent memory leaks
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      resolve(newState.cctxs);
    } else {
      reject(new Error("CCTX aborted or reverted"));
    }
  }
};
