import axios, { isAxiosError } from "axios";
import * as bitcoin from "bitcoinjs-lib";

import {
  DEFAULT_BITCOIN_API,
  DEFAULT_GAS_PRICE_API,
} from "../../../../types/bitcoin.constants";
import { BtcUtxo } from "../../../../types/bitcoin.types";
import {
  bitcoinBuildUnsignedPsbtWithMemo,
  constructMemo,
  getDepositFee,
} from "../../../../utils/bitcoin.memo.helpers";
import { fetchUtxos } from "../../../../utils/bitcoin.utxo.helpers";

/**
 * Parameters for creating a Bitcoin memo call transaction
 */
export interface MemoCallParams {
  /** Optional API URL override */
  bitcoinApi?: string;
  /** Data to include in OP_RETURN output */
  data: string;
  /** User's BTC address (same as userAddress, for clarity) */
  fromAddress: string;
  /** ZetaChain gas price endpoint */
  gasPriceEndpoint?: string;
  /** ZetaChain gateway address to send to */
  gatewayAddress: string;
  /** Optional network override (defaults to signet) */
  network?: "signet" | "mainnet";
  /** Universal Contract address */
  receiver: string;
  /** User's BTC address for receiving change */
  userAddress: string;
}

/**
 * Result from building a PSBT
 */
export interface MemoCallPsbtResult {
  /** PSBT encoded as base64 string for wallet signing */
  psbtBase64: string;
  /** Address that should sign the PSBT */
  signingAddress: string;
  /** Input indexes that need to be signed */
  signingIndexes: number[];
}

/**
 * Result from broadcasting a transaction
 */
export interface MemoBroadcastResult {
  /** Raw transaction hex */
  txHex: string;
  /** Transaction ID */
  txid: string;
}

/**
 * Builds an unsigned PSBT for a memo call transaction
 * This PSBT must be signed by the wallet before broadcasting
 */
export const buildBitcoinMemoCallPsbt = async (
  params: MemoCallParams
): Promise<MemoCallPsbtResult> => {
  const api = params.bitcoinApi || DEFAULT_BITCOIN_API;

  // Fetch UTXOs, fee rate, and deposit fee
  const utxos = await fetchUtxos(params.fromAddress, api);
  if (!utxos.length) {
    throw new Error("No UTXOs found for address");
  }

  const memo = constructMemo(params.receiver, params.data);

  const amount = 0;
  const networkFee = 600;
  const depositFeeResponse = await getDepositFee(
    params.gasPriceEndpoint || DEFAULT_GAS_PRICE_API
  );
  const depositFee = depositFeeResponse < 600 ? 600 : depositFeeResponse;

  const network = params.network || "signet";

  const { psbt, pickedUtxos } = await bitcoinBuildUnsignedPsbtWithMemo({
    address: params.userAddress,
    amount,
    api,
    depositFee,
    gateway: params.gatewayAddress,
    memo: memo || "",
    network,
    networkFee,
    utxos,
  });

  return {
    psbtBase64: psbt.toBase64(),
    signingAddress: params.fromAddress,
    signingIndexes: pickedUtxos.map((_: BtcUtxo, i: number) => i), // All inputs need signing
  };
};

/**
 * Finalizes a signed PSBT and broadcasts it to the network
 * @param signedPsbtBase64 - The PSBT after wallet signing (base64 encoded)
 * @param bitcoinApi - Optional API URL override
 * @returns Transaction ID and hex
 */
export const finalizeBitcoinMemoCall = async (
  signedPsbtBase64: string,
  bitcoinApi?: string
): Promise<MemoBroadcastResult> => {
  const api = bitcoinApi || DEFAULT_BITCOIN_API;

  try {
    // Parse the signed PSBT
    const signedPsbt = bitcoin.Psbt.fromBase64(signedPsbtBase64);

    // Finalize all inputs
    signedPsbt.finalizeAllInputs();

    // Extract the transaction
    const tx = signedPsbt.extractTransaction();
    const txHex = tx.toHex();

    // Broadcast to the network
    const { data: txid } = await axios.post<string>(`${api}/tx`, txHex, {
      headers: { "Content-Type": "text/plain" },
    });

    return { txHex, txid };
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(
        `Failed to broadcast transaction: ${
          error.response?.data || error.message
        }`
      );
    }
    throw error;
  }
};
