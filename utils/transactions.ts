import { isValidTransactionDigest as isValidSuiTransactionDigest } from "@mysten/sui/utils";
import bs58 from "bs58";
import { ethers } from "ethers";
import { isString } from "lodash";

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
      outbound_tx_hash: cctx.outbound_params[0].hash,
      outbound_tx_tss_nonce: Number(cctx.outbound_params[0].tss_nonce),
      receiver_chainId: String(cctx.outbound_params[0].receiver_chainId),
      sender_chain_id: String(cctx?.inbound_params?.sender_chain_id),
      status: String(cctx?.cctx_status?.status),
      status_message: String(cctx?.cctx_status?.status_message),
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
 * @description Check if the input hash matches a valid EVM transaction hash
 */
export const isValidEVMTxHash = (txHash: string): boolean =>
  ethers.isHexString(txHash, 32);

/**
 * @description Check if the input hash matches a valid Bitcoin transaction hash
 */
export const isValidBitcoinTxHash = (txHash: string): boolean =>
  /^[a-fA-F0-9]{64}$/.test(txHash);

/**
 * @description Solana transaction signatures (hashes) are base58-encoded strings.
 *              To validate a transaction hash, we can check if it’s a valid base58 string of a reasonable length.
 */
export const isValidSolanaTxHash = (txHash: string): boolean => {
  try {
    const decoded = bs58.decode(txHash);
    return decoded.length === 64; // Solana transaction signatures are 64 bytes long
  } catch (error) {
    return false;
  }
};

/**
 * @description TON transaction hashes have the same format as Bitcoin transaction hashes
 * but are kept as a separate function for clarity and future-proofing
 */
export const isValidTonTxHash = (hash: string): boolean =>
  isValidBitcoinTxHash(hash);

/**
 * Validate transaction hash format for multiple blockchains
 * Supports: EVM (Ethereum), Bitcoin (mainnet/testnet), Solana, SUI, TON
 */
export const isValidTxHash = (hash: string): boolean => {
  if (!hash || !isString(hash)) return false;

  // EVM chains (Ethereum, etc) - 0x prefix with 64 hex chars
  if (isValidEVMTxHash(hash)) {
    return true;
  }

  // Bitcoin - 64 hex chars (no prefix)
  if (isValidBitcoinTxHash(hash)) {
    return true;
  }

  // Solana - Base58 encoded string
  if (isValidSolanaTxHash(hash)) {
    return true;
  }

  // SUI - Transaction digest encoding
  if (isValidSuiTransactionDigest(hash)) {
    return true;
  }

  // TON - 64 hex chars (similar to Bitcoin)
  if (isValidTonTxHash(hash)) {
    return true;
  }

  return false;
};
