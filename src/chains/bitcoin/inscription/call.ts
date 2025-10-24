import * as ecc from "@bitcoinerlab/secp256k1";
import axios, { isAxiosError } from "axios";
import * as bitcoin from "bitcoinjs-lib";
import { ethers } from "ethers";

import {
  BITCOIN_FEES,
  DEFAULT_BITCOIN_API,
  ESTIMATED_VIRTUAL_SIZE,
} from "../../../../types/bitcoin.constants";
import { ParseAbiValuesReturnType } from "../../../../types/parseAbiValues.types";
import {
  calculateRevealFee,
  prepareUtxos,
} from "../../../../utils/bitcoin.inscription.helpers";
import { trim0x } from "../../../../utils/trim0x";
import { bitcoinEncode, EncodingFormat, OpCode } from "./encode";
import { makeCommitPsbt } from "./makeCommitPsbt";
import { makeRevealPsbt } from "./makeRevealPsbt";

// Initialize ECC library for bitcoinjs-lib (browser-safe, no WASM)
bitcoin.initEccLib(ecc);

/**
 * Parameters for creating a Bitcoin inscription call transaction
 */
export interface InscriptionCallParams {
  /** Optional API URL override */
  bitcoinApi?: string;
  /** Optional commit fee in satoshis (defaults to DEFAULT_COMMIT_FEE_SAT) */
  commitFee?: number;
  /** Raw hex data (alternative to types/values/receiver) */
  data?: string;
  /** Encoding format for the inscription */
  format?: EncodingFormat;
  /** User's BTC address for receiving change */
  fromAddress: string;
  /** ZetaChain gateway address to send to */
  gatewayAddress: string;
  /** Network (signet or mainnet) */
  network: "signet" | "mainnet";
  /** x-only public key (32 bytes hex string or Uint8Array) for Taproot. If 33 bytes (compressed), first byte will be stripped automatically. */
  publicKey: string | Uint8Array;
  /** Universal Contract address (required if using types/values) */
  receiver?: string;
  /** Optional revert address (defaults to fromAddress) */
  revertAddress?: string;
  /** ABI types array (alternative to data) */
  types?: string[];
  /** Values corresponding to types (alternative to data) */
  values?: ParseAbiValuesReturnType;
}

/**
 * Result from building the commit PSBT
 */
export interface InscriptionCallCommitPsbtResult {
  /** Data needed to build the reveal transaction later */
  commitData: {
    controlBlock: Buffer;
    internalKey: Buffer;
    leafScript: Buffer;
  };
  /** Commit fee in satoshis */
  commitFee: number;
  /** PSBT encoded as base64 string for wallet signing */
  commitPsbtBase64: string;
  /** Deposit fee in satoshis */
  depositFee: number;
  /** Raw inscription data as hex string */
  rawInscriptionData: string;
  /** Reveal fee in satoshis */
  revealFee: number;
  /** Address that should sign the commit PSBT */
  signingAddress: string;
  /** Input indexes that need to be signed */
  signingIndexes: number[];
}

/**
 * Parameters for broadcasting commit and building reveal PSBT
 */
export interface BroadcastCommitAndBuildRevealParams {
  /** Optional API URL override */
  bitcoinApi?: string;
  /** Data needed to build the reveal transaction */
  commitData: {
    controlBlock: Buffer;
    internalKey: Buffer;
    leafScript: Buffer;
  };
  /** Deposit fee in satoshis (from commit result) */
  depositFee: number;
  /** User's address for signing */
  fromAddress: string;
  /** ZetaChain gateway address */
  gatewayAddress: string;
  /** Network (signet or mainnet) */
  network: "signet" | "mainnet";
  /** Reveal fee in satoshis (from commit result) */
  revealFee: number;
  /** The commit PSBT after wallet signing (base64 encoded) */
  signedCommitPsbtBase64: string;
}

/**
 * Result from broadcasting commit and building reveal PSBT
 */
export interface InscriptionCallRevealPsbtResult {
  /** Commit transaction ID */
  commitTxid: string;
  /** Deposit fee in satoshis */
  depositFee: number;
  /** Reveal fee in satoshis */
  revealFee: number;
  /** PSBT encoded as base64 string for wallet signing */
  revealPsbtBase64: string;
  /** Address that should sign the reveal PSBT */
  signingAddress: string;
  /** Input indexes that need to be signed */
  signingIndexes: number[];
}

/**
 * Result from broadcasting the reveal transaction
 */
export interface InscriptionRevealBroadcastResult {
  /** Reveal transaction ID */
  revealTxid: string;
  /** Raw reveal transaction hex */
  txHex: string;
}

/**
 * Builds an unsigned commit PSBT for an inscription call transaction
 * This PSBT must be signed by the wallet before broadcasting
 */
export const buildBitcoinInscriptionCallCommitPsbt = async (
  params: InscriptionCallParams
): Promise<InscriptionCallCommitPsbtResult> => {
  const api = params.bitcoinApi || DEFAULT_BITCOIN_API;
  const network =
    params.network === "mainnet"
      ? bitcoin.networks.bitcoin
      : bitcoin.networks.testnet;

  const revertAddress = params.revertAddress || params.fromAddress;

  // Convert publicKey to Buffer and extract x-only (32 bytes)
  let pubKeyBuffer: Buffer;
  if (typeof params.publicKey === "string") {
    pubKeyBuffer = Buffer.from(params.publicKey, "hex");
  } else {
    pubKeyBuffer = Buffer.from(params.publicKey);
  }

  // If 33 bytes (compressed with prefix), strip first byte to get x-only
  const xOnlyPubKey =
    pubKeyBuffer.length === 33 ? pubKeyBuffer.subarray(1, 33) : pubKeyBuffer;

  if (xOnlyPubKey.length !== 32) {
    throw new Error(
      `Invalid public key length: expected 32 or 33 bytes, got ${pubKeyBuffer.length}`
    );
  }

  // Build inscription data
  let data: Buffer;
  if (params.types && params.values && params.receiver) {
    // For Bitcoin inscriptions, use full encoding with receiver + revert address
    const encodedMessage = new ethers.AbiCoder().encode(
      params.types,
      params.values
    );
    data = Buffer.from(
      bitcoinEncode(
        params.receiver,
        Buffer.from(trim0x(encodedMessage), "hex"),
        { revertAddress },
        OpCode.DepositAndCall,
        params.format || EncodingFormat.ABI
      ),
      "hex"
    );
  } else if (params.data) {
    // Use raw hex data
    data = Buffer.from(params.data, "hex");
  } else {
    throw new Error("Provide either (data) or (types, values, and receiver)");
  }

  // Prepare UTXOs
  const preparedUtxos = await prepareUtxos(params.fromAddress, api);

  const commitFee = params.commitFee ?? BITCOIN_FEES.DEFAULT_COMMIT_FEE_SAT;

  // Build commit PSBT
  const commit = makeCommitPsbt({
    amount: 0, // call does not transfer value
    changeAddress: params.fromAddress,
    feeSat: commitFee,
    inscriptionData: data,
    internalPubkey: xOnlyPubKey,
    network,
    utxos: preparedUtxos,
  });

  const { revealFee, vsize } = calculateRevealFee(
    commit,
    BITCOIN_FEES.DEFAULT_REVEAL_FEE_RATE
  );

  const depositFee = Math.ceil(
    (ESTIMATED_VIRTUAL_SIZE * 2 * revealFee) / vsize
  );

  return {
    commitData: {
      controlBlock: commit.controlBlock,
      internalKey: commit.internalKey,
      leafScript: commit.leafScript,
    },
    commitFee,
    commitPsbtBase64: commit.unsignedPsbtBase64,
    depositFee,
    rawInscriptionData: data.toString("hex"),
    revealFee,
    signingAddress: params.fromAddress,
    signingIndexes: commit.signingIndexes,
  };
};

/**
 * Broadcasts the signed commit PSBT and builds the reveal PSBT
 * @param params - Parameters including signed commit PSBT, commit data, and fees
 * @returns Commit txid and unsigned reveal PSBT
 */
export const broadcastCommitAndBuildRevealPsbt = async (
  params: BroadcastCommitAndBuildRevealParams
): Promise<InscriptionCallRevealPsbtResult> => {
  const api = params.bitcoinApi || DEFAULT_BITCOIN_API;
  const btcNetwork =
    params.network === "mainnet"
      ? bitcoin.networks.bitcoin
      : bitcoin.networks.testnet;

  try {
    // Parse and finalize the signed commit PSBT
    const commitPsbt = bitcoin.Psbt.fromBase64(params.signedCommitPsbtBase64);
    commitPsbt.finalizeAllInputs();

    // Extract and broadcast the commit transaction
    const commitTx = commitPsbt.extractTransaction();
    const commitTxHex = commitTx.toHex();

    const { data: commitTxid } = await axios.post<string>(
      `${api}/tx`,
      commitTxHex,
      {
        headers: { "Content-Type": "text/plain" },
      }
    );

    // Build reveal PSBT using the commit txid
    const revealInfo = makeRevealPsbt(
      commitTxid,
      0, // commit output index
      params.revealFee + params.depositFee,
      params.gatewayAddress,
      BITCOIN_FEES.DEFAULT_REVEAL_FEE_RATE,
      params.commitData,
      btcNetwork
    );

    return {
      commitTxid,
      depositFee: params.depositFee,
      revealFee: params.revealFee,
      revealPsbtBase64: revealInfo.unsignedPsbtBase64,
      signingAddress: params.fromAddress,
      signingIndexes: revealInfo.signingIndexes,
    };
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(
        `Failed to broadcast commit transaction: ${
          error.response?.data || error.message
        }`
      );
    }
    throw error;
  }
};

/**
 * Finalizes a signed reveal PSBT and broadcasts it to the network
 * @param signedRevealPsbtBase64 - The reveal PSBT after wallet signing (base64 encoded)
 * @param bitcoinApi - Optional API URL override
 * @returns Reveal transaction ID and hex
 */
export const finalizeBitcoinInscriptionCallReveal = async (
  signedRevealPsbtBase64: string,
  bitcoinApi?: string
): Promise<InscriptionRevealBroadcastResult> => {
  const api = bitcoinApi || DEFAULT_BITCOIN_API;

  try {
    // Parse the signed reveal PSBT
    const revealPsbt = bitcoin.Psbt.fromBase64(signedRevealPsbtBase64);

    // Finalize all inputs
    revealPsbt.finalizeAllInputs();

    // Extract the transaction
    const revealTx = revealPsbt.extractTransaction();
    const txHex = revealTx.toHex();

    // Broadcast to the network
    const { data: revealTxid } = await axios.post<string>(`${api}/tx`, txHex, {
      headers: { "Content-Type": "text/plain" },
    });

    return { revealTxid, txHex };
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(
        `Failed to broadcast reveal transaction: ${
          error.response?.data || error.message
        }`
      );
    }
    throw error;
  }
};
