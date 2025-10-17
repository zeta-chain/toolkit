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
 * Recommended fee rates from mempool API
 */
interface MempoolFeeRecommendation {
  economyFee: number;
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  minimumFee: number;
}

/**
 * Parameters for creating a Bitcoin memo call transaction
 */
export interface MemoCallParams {
  /** Optional API URL override */
  bitcoinApi?: string;
  /** Data to include in OP_RETURN output */
  data: string;
  /** Optional fee rate in sat/vB (if not provided, fetches from mempool API using halfHourFee) */
  feeRate?: number;
  /** User's BTC address for UTXOs, signing, and receiving change */
  fromAddress: string;
  /** ZetaChain gas price endpoint */
  gasPriceEndpoint?: string;
  /** ZetaChain gateway address to send to */
  gatewayAddress: string;
  /** Network (signet or mainnet) */
  network: "signet" | "mainnet";
  /** Universal Contract address */
  receiver: string;
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

  // Fetch UTXOs
  const utxos = await fetchUtxos(params.fromAddress, api);
  if (!utxos.length) {
    throw new Error("No UTXOs found for address");
  }

  // Fetch fee rate from mempool API if not provided
  let feeRate = params.feeRate;
  if (!feeRate) {
    try {
      const { data: feeRec } = await axios.get<MempoolFeeRecommendation>(
        `${api}/v1/fees/recommended`
      );
      // Use halfHourFee with a minimum floor of 2 sat/vB
      feeRate = Math.max(feeRec.halfHourFee, 2);
    } catch (error) {
      // Fallback to conservative default if API fails
      console.warn("Failed to fetch fee rates, using default 3 sat/vB");
      feeRate = 3;
    }
  }

  const memo = constructMemo(params.receiver, params.data);

  const amount = 0;

  // Calculate network fee based on estimated transaction size
  // Typical P2WPKH tx: 1 input (~68 vB) + 3 outputs (gateway + OP_RETURN + change) (~110 vB) ≈ 178 vB
  // Add memo length overhead
  const memoLength = memo ? Buffer.from(memo, "hex").length : 0;
  const estimatedVsize = 68 + 110 + memoLength; // Conservative estimate
  const networkFee = Math.ceil(estimatedVsize * feeRate);

  const depositFeeResponse = await getDepositFee(
    params.gasPriceEndpoint || DEFAULT_GAS_PRICE_API
  );
  const depositFee = depositFeeResponse < 600 ? 600 : depositFeeResponse;

  const { psbt, pickedUtxos } = await bitcoinBuildUnsignedPsbtWithMemo({
    address: params.fromAddress,
    amount,
    api,
    depositFee,
    gateway: params.gatewayAddress,
    memo: memo || "",
    network: params.network,
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
