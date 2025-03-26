import {
  CCTX,
  CCTXs,
  Emitter,
  PendingNonce,
  Spinners,
} from "../types/trackCCTX.types";
import { getCctxByHash } from "./api";
import { formatStatusText, shortenHash } from "./formatting";

/**
 * Process newly discovered CCTX hashes
 */
export const processNewCctxHashes = (
  hashes: string[],
  cctxs: CCTXs,
  spinners: Spinners,
  emitter: Emitter | null,
  json: boolean
): { cctxs: CCTXs; spinners: Spinners } => {
  const newCctxs = { ...cctxs };
  const newSpinners = { ...spinners };

  hashes.forEach((hash) => {
    if (hash && !newCctxs[hash] && !newSpinners[hash]) {
      newCctxs[hash] = [];
      if (!json && emitter) {
        emitter.emit("add", { hash, text: hash });
        newSpinners[hash] = true;
      }
    }
  });

  return { cctxs: newCctxs, spinners: newSpinners };
};

/**
 * Update the status of a specific transaction
 */
export const updateTransactionStatus = async (
  api: string,
  hash: string,
  cctxs: CCTXs
): Promise<CCTX | undefined> => {
  try {
    const cctx = await getCctxByHash(api, hash);
    if (!cctx) return undefined;

    const tx: CCTX = {
      confirmed_on_destination: false,
      outbound_tx_hash: cctx.outbound_params[0].outbound_tx_hash,
      outbound_tx_tss_nonce: cctx.outbound_params[0].outbound_tx_tss_nonce,
      receiver_chainId: cctx.outbound_params[0].receiver_chainId,
      sender_chain_id: cctx.inbound_params.sender_chain_id,
      status: cctx.cctx_status.status,
      status_message: cctx.cctx_status.status_message,
    };

    const lastCCTX = cctxs[hash][cctxs[hash].length - 1];
    const isEmpty = cctxs[hash].length === 0;
    const statusDefined =
      tx.status !== undefined && tx.status_message !== undefined;

    if (isEmpty || (statusDefined && lastCCTX?.status !== tx.status)) {
      return tx;
    }

    return undefined;
  } catch (error) {
    // No need to log errors here as getCCTX already handles that
    return undefined;
  }
};

/**
 * Update the UI via emitter
 */
export const updateEmitter = (
  hash: string,
  tx: CCTX,
  cctxs: CCTXs,
  spinners: Spinners,
  pendingNonces: PendingNonce[],
  emitter: Emitter | null,
  json: boolean
): Spinners => {
  if (json || !spinners[hash] || !emitter) {
    return spinners;
  }

  const sender = cctxs[hash]?.[0].sender_chain_id;
  const receiver = cctxs[hash]?.[0].receiver_chainId;

  // Calculate queue position if applicable
  let queue = "";
  const pendingNonce = pendingNonces.find(
    (n) => n.chain_id === tx.receiver_chainId
  );

  if (pendingNonce) {
    const pending = pendingNonce.nonce_low || "0";
    const current = tx.outbound_tx_tss_nonce;
    const diff = current - Number(pending);
    queue = diff > 0 ? ` (${diff} in queue)` : "";
  }

  const shortHash = shortenHash(hash);
  const statusText = formatStatusText(tx);

  const text = `${shortHash}: ${sender} → ${receiver}${queue}: ${statusText}`;

  // Update UI based on status
  const s = tx.status;
  const newSpinners = { ...spinners };

  if (s === "OutboundMined") {
    emitter.emit("succeed", { hash, text });
    newSpinners[hash] = false;
  } else if (s === "Aborted" || s === "Reverted") {
    emitter.emit("fail", { hash, text });
    newSpinners[hash] = false;
  } else {
    emitter.emit("update", { hash, text });
  }

  return newSpinners;
};

/**
 * Check if all transactions have completed
 */
export const checkCompletionStatus = (
  cctxs: CCTXs,
  emitter: Emitter | null,
  json: boolean
): { isComplete: boolean; isSuccessful: boolean } => {
  const allTxs = Object.keys(cctxs);
  if (allTxs.length === 0) {
    return { isComplete: false, isSuccessful: false };
  }

  const finalStatuses = allTxs.map((hash) => {
    const txs = cctxs[hash];
    return txs[txs.length - 1]?.status;
  });

  // These are terminal states where we should stop polling
  const allTerminal = finalStatuses.every((status) =>
    ["OutboundMined", "Aborted", "Reverted"].includes(status)
  );

  if (allTerminal) {
    // Only OutboundMined is considered successful
    const allSuccessful = finalStatuses.every(
      (status) => status === "OutboundMined"
    );

    if (allSuccessful) {
      if (emitter) {
        emitter.emit("mined-success", { cctxs });
      }
      if (json) {
        console.log(JSON.stringify(cctxs, null, 2));
      }
    } else {
      if (emitter) {
        emitter.emit("mined-fail", { cctxs });
      }
    }

    return { isComplete: true, isSuccessful: allSuccessful };
  }

  return { isComplete: false, isSuccessful: false };
};

/**
 * Validate transaction hash format
 */
export const validateTransactionHash = (hash: string): boolean => {
  return /^0x[0-9a-fA-F]{64}$/.test(hash);
};
