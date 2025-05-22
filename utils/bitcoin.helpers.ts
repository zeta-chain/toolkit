import axios from "axios";
import * as bitcoin from "bitcoinjs-lib";

import {
  BITCOIN_FEES,
  BITCOIN_LIMITS,
  BITCOIN_NETWORKS,
  BITCOIN_SCRIPT,
  BITCOIN_TX,
} from "../types/bitcoin.constants";
import type { BtcTxById, BtcUtxo } from "../types/bitcoin.types";
import { getDepositFee } from "./bitcoinMemo.helpers";

/**
 * Bitcoin Signet network parameters
 * Used for creating Signet-compatible transactions
 */
export const SIGNET = {
  bech32: BITCOIN_NETWORKS.SIGNET.BECH32,
  bip32: {
    private: BITCOIN_NETWORKS.SIGNET.BIP32.PRIVATE,
    public: BITCOIN_NETWORKS.SIGNET.BIP32.PUBLIC,
  },
  messagePrefix: BITCOIN_NETWORKS.SIGNET.MESSAGE_PREFIX,
  pubKeyHash: BITCOIN_NETWORKS.SIGNET.PUBKEY_HASH,
  scriptHash: BITCOIN_NETWORKS.SIGNET.SCRIPT_HASH,
  wif: BITCOIN_NETWORKS.SIGNET.WIF,
};

export const LEAF_VERSION_TAPSCRIPT = BITCOIN_SCRIPT.LEAF_VERSION_TAPSCRIPT;

/**
 * Encodes a number as a Bitcoin compact size.
 * Bitcoin uses a custom variable-length integer format for script element counts and lengths.
 *
 * @param n - The number to encode
 * @returns A Buffer containing the compact size representation
 */
export const compactSize = (n: number): Buffer => {
  if (n < 0xfd) return Buffer.from([n]);
  if (n <= 0xffff) {
    const buf = Buffer.alloc(3);
    buf.writeUInt8(0xfd, 0);
    buf.writeUInt16LE(n, 1);
    return buf;
  }
  if (n <= 0xffffffff) {
    const buf = Buffer.alloc(5);
    buf.writeUInt8(0xfe, 0);
    buf.writeUInt32LE(n, 1);
    return buf;
  }
  // uint64
  const buf = Buffer.alloc(9);
  buf.writeUInt8(0xff, 0);
  buf.writeBigUInt64LE(BigInt(n), 1);
  return buf;
};

/**
 * Builds a witness stack for the reveal transaction.
 * The witness contains the data needed to reveal the inscribed data and spend the Taproot output.
 *
 * @param leafScript - The script containing the cross-chain message
 * @param controlBlock - The Taproot control block needed to validate the script path
 * @returns A Buffer containing the encoded witness data
 */
export const buildRevealWitness = (
  leafScript: Buffer,
  controlBlock: Buffer
) => {
  // Empty signature - we don't need a real signature as we're using the script path
  const sig = Buffer.alloc(64);

  const stack = [sig, leafScript, controlBlock];
  const parts = [compactSize(stack.length)];
  for (const item of stack) {
    parts.push(compactSize(item.length));
    parts.push(item);
  }
  return Buffer.concat(parts);
};

/**
 * Creates a commit transaction that embeds cross-chain message data in a Taproot output.
 * The commit transaction creates a special UTXO that can be spent later to reveal the inscription.
 *
 * @param key - Bitcoin signer (private key)
 * @param utxos - Available UTXOs to spend
 * @param changeAddress - Address to send change to
 * @param inscriptionData - Cross-chain message data to inscribe
 * @param api - Bitcoin API endpoint for fetching transaction data
 * @param amountSat - Amount to inscribe in satoshis
 * @param feeSat - Fee for the transaction in satoshis
 * @returns Object containing transaction data and Taproot script details
 */
export const makeCommitTransaction = async (
  key: bitcoin.Signer,
  utxos: BtcUtxo[],
  changeAddress: string,
  inscriptionData: Buffer,
  api: string,
  amount: number,
  feeSat = BITCOIN_FEES.DEFAULT_COMMIT_FEE_SAT
) => {
  const scriptItems = [
    key.publicKey.slice(1, 33),
    bitcoin.opcodes.OP_CHECKSIG,
    bitcoin.opcodes.OP_FALSE,
    bitcoin.opcodes.OP_IF,
  ];
  // Add inscription data in chunks if it exceeds 520 bytes (max script element size)
  const MAX_SCRIPT_ELEMENT_SIZE = 520;
  if (inscriptionData.length > MAX_SCRIPT_ELEMENT_SIZE) {
    for (let i = 0; i < inscriptionData.length; i += MAX_SCRIPT_ELEMENT_SIZE) {
      const end = Math.min(i + MAX_SCRIPT_ELEMENT_SIZE, inscriptionData.length);
      scriptItems.push(inscriptionData.slice(i, end));
    }
  } else {
    scriptItems.push(inscriptionData);
  }

  scriptItems.push(bitcoin.opcodes.OP_ENDIF);

  const leafScript = bitcoin.script.compile(scriptItems);
  /* p2tr */
  const { output: commitScript, witness } = bitcoin.payments.p2tr({
    internalPubkey: key.publicKey.slice(1, 33),
    network: SIGNET,
    redeem: { output: leafScript, redeemVersion: LEAF_VERSION_TAPSCRIPT },
    scriptTree: { output: leafScript },
  });

  if (!witness) throw new Error("taproot build failed");
  const { revealFee, vsize } = calculateRevealFee(
    {
      controlBlock: witness[witness.length - 1],
      internalKey: key.publicKey.slice(1, 33),
      leafScript,
    },
    BITCOIN_FEES.DEFAULT_REVEAL_FEE_RATE
  );
  const depositFee = Math.ceil((68 * 2 * revealFee) / vsize);
  const amountSat = amount + revealFee + depositFee;

  /* pick utxos */
  utxos.sort((a, b) => a.value - b.value);
  let inTotal = 0;
  const picks: BtcUtxo[] = [];
  for (const u of utxos) {
    inTotal += u.value;
    picks.push(u);
    if (inTotal >= amountSat + feeSat) break;
  }
  if (inTotal < amountSat + feeSat) throw new Error("Not enough funds");
  const changeSat = inTotal - amountSat - feeSat;

  if (!commitScript) throw new Error("taproot build failed");

  const psbt = new bitcoin.Psbt({ network: SIGNET });
  psbt.addOutput({ script: commitScript, value: amountSat });
  if (changeSat > 0)
    psbt.addOutput({ address: changeAddress, value: changeSat });
  for (const u of picks) {
    const tx = (await axios.get<BtcTxById>(`${api}/tx/${u.txid}`)).data;
    psbt.addInput({
      hash: u.txid,
      index: u.vout,
      witnessUtxo: {
        script: Buffer.from(tx.vout[u.vout].scriptpubkey, "hex"),
        value: u.value,
      },
    });
  }

  psbt.signAllInputs(key);
  psbt.finalizeAllInputs();

  return {
    controlBlock: witness[witness.length - 1],
    internalKey: key.publicKey.slice(1, 33),
    leafScript,
    txHex: psbt.extractTransaction().toHex(),
  };
};

export const getTxVirtualSize = (tx: bitcoin.Transaction): number => {
  const baseSize = tx.byteLength(false); // no witness data
  const totalSize = tx.byteLength(); // with witness data
  const weight = baseSize * 3 + totalSize;
  const vSize = Math.ceil(weight / 4);
  return vSize;
};

export const calculateRevealFee = (
  commitData: { controlBlock: Buffer; internalKey: Buffer; leafScript: Buffer },
  feeRate: number
) => {
  const witness = buildRevealWitness(
    commitData.leafScript,
    commitData.controlBlock
  );

  const txOverhead = BITCOIN_TX.TX_OVERHEAD; // 10 bytes: version (4) + marker (1) + flag (1) + locktime (4)

  // Input vbytes:
  // 36 bytes: outpoint (32-byte txid + 4-byte vout)
  // 1 byte: scriptSig length (always 0 for segwit, but still encoded as a 1-byte varint)
  // 4 bytes: sequence
  // witness length is counted in weight units, so we divide by 4 to convert to virtual bytes
  const inputVbytes = 36 + 1 + 4 + Math.ceil(witness.length / 4);

  const outputVbytes = BITCOIN_TX.P2WPKH_OUTPUT_VBYTES; // 31 bytes: 8 (value) + 1 (script length) + 22 (P2WPKH script)

  const vsize = txOverhead + inputVbytes + outputVbytes;

  const revealFee = Math.ceil(vsize * feeRate);

  return { revealFee, vsize };
};

/**
 * Creates a reveal transaction that spends the commit transaction output and reveals the inscription.
 * This transaction sends funds to the ZetaChain gateway while exposing the cross-chain message.
 *
 * @param commitTxId - Transaction ID of the commit transaction
 * @param commitVout - Output index in the commit transaction to spend (typically 0)
 * @param commitValue - Value of the commit output in satoshis
 * @param to - Gateway address to send funds to
 * @param feeRate - Fee rate in satoshis per vbyte
 * @param commitData - Data from the commit transaction needed to spend it
 * @param key - Bitcoin signer (private key)
 * @returns Hex-encoded transaction ready for broadcast
 */
export const makeRevealTransaction = (
  commitTxId: string,
  commitVout: number,
  commitValue: number,
  to: string,
  feeRate: number,
  commitData: { controlBlock: Buffer; internalKey: Buffer; leafScript: Buffer },
  key: bitcoin.Signer
) => {
  const psbt = new bitcoin.Psbt({ network: SIGNET });
  const { output: commitScript } = bitcoin.payments.p2tr({
    internalPubkey: commitData.internalKey,
    network: SIGNET,
    scriptTree: { output: commitData.leafScript },
  });
  psbt.addInput({
    hash: commitTxId,
    index: commitVout,
    tapLeafScript: [
      {
        controlBlock: commitData.controlBlock,
        leafVersion: LEAF_VERSION_TAPSCRIPT,
        script: commitData.leafScript,
      },
    ],
    witnessUtxo: { script: commitScript!, value: commitValue },
  });

  const { revealFee } = calculateRevealFee(commitData, feeRate);

  const outputValue = commitValue - revealFee;
  if (outputValue < BITCOIN_LIMITS.DUST_THRESHOLD.P2WPKH) {
    throw new Error(
      `Insufficient value in commit output (${commitValue} sat) to cover reveal fee (${revealFee} sat) and maintain minimum output (${BITCOIN_LIMITS.DUST_THRESHOLD.P2WPKH} sat)`
    );
  }

  psbt.addOutput({ address: to, value: outputValue });

  psbt.signInput(0, key);
  psbt.finalizeAllInputs();

  return psbt.extractTransaction(true).toHex();
};

/**
 * Calculates the total fees for a Bitcoin inscription transaction
 * @param data - The inscription data buffer
 * @returns Object containing commit fee, reveal fee, deposit fee, and total fee
 */
export const calculateFees = async (data: Buffer, api: string) => {
  const commitFee = BITCOIN_FEES.DEFAULT_COMMIT_FEE_SAT;
  const revealFee = Math.ceil(
    (BITCOIN_TX.TX_OVERHEAD +
      36 +
      1 +
      43 +
      Math.ceil(data.length / 4) +
      BITCOIN_TX.P2WPKH_OUTPUT_VBYTES) *
      BITCOIN_FEES.DEFAULT_REVEAL_FEE_RATE
  );

  const depositFee = await getDepositFee(api);

  const totalFee = commitFee + revealFee + depositFee;
  return { commitFee, depositFee, revealFee, totalFee };
};

/**
 * Calculates the deposit fee for a Bitcoin transaction
 * @param txFee - Total transaction fee (totalInputValue - totalOutputValue)
 * @param txVsize - Virtual size of the transaction in vbytes
 * @returns The calculated deposit fee in satoshis
 */
export const calculateDepositFee = (txFee: number, txVsize: number): number => {
  return Math.ceil((txFee / txVsize) * 68 * 2);
};
