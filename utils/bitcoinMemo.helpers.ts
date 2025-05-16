import axios from "axios";
import * as bitcoin from "bitcoinjs-lib";

import { BITCOIN_FEES, BITCOIN_TX } from "../types/bitcoin.constants";
import type { BtcTxById, BtcUtxo } from "../types/bitcoin.types";

const errorTooLong =
  "Invalid memo: too long. Please, use less than 80 bytes (including the 20 bytes of the receiver address) or use inscription.";

const errorNoReceiver =
  "Invalid memo: first 20 bytes of the data should be EVM receiver address on ZetaChain";

/**
 * Calculates the fee for a memo transaction based on its size
 * @param memoLength - Length of the memo in bytes
 * @returns The calculated fee in satoshis
 */
export const calculateMemoTransactionFee = (memoLength: number): number => {
  // Calculate transaction size in vbytes
  const txOverhead = BITCOIN_TX.TX_OVERHEAD;
  const inputVbytes = 36 + 1 + 43 + 107; // txin + marker+flag + varint scriptSig len (0) + sequence + witness weight/4
  const outputVbytes = BITCOIN_TX.P2WPKH_OUTPUT_VBYTES;
  const memoOutputVbytes = 9 + memoLength; // varint len + memo length
  const vsize = txOverhead + inputVbytes + outputVbytes + memoOutputVbytes;

  // Calculate fee based on fee rate
  return Math.ceil(vsize * BITCOIN_FEES.DEFAULT_REVEAL_FEE_RATE);
};

export const bitcoinMakeTransactionWithMemo = async (
  gateway: string,
  key: bitcoin.Signer,
  amount: number,
  utxos: BtcUtxo[],
  address: string,
  api: string,
  m: string = ""
) => {
  const TESTNET = bitcoin.networks.testnet;
  const memo = Buffer.from(m, "hex");
  console.log(memo.length);

  if (!memo || memo.length < 20) throw new Error(errorNoReceiver);
  if (memo.length > 80) throw new Error(errorTooLong);

  utxos.sort((a, b) => a.value - b.value); // sort by value, ascending
  const fee = calculateMemoTransactionFee(memo.length);
  const memoAmount = 0; // Use 0 satoshis for OP_RETURN output
  const total = amount + fee;
  let sum = 0;
  const pickUtxos = [];
  for (let i = 0; i < utxos.length; i++) {
    const utxo = utxos[i];
    sum += utxo.value;
    pickUtxos.push(utxo);
    if (sum >= total) break;
  }
  if (sum < total) throw new Error("Not enough funds");
  const change = sum - total;
  const txs = []; // txs corresponding to the utxos
  for (let i = 0; i < pickUtxos.length; i++) {
    const utxo = pickUtxos[i];
    const p1Response = await axios.get<BtcTxById>(`${api}/tx/${utxo.txid}`);
    const data = p1Response.data;
    txs.push(data);
  }

  // try creating a transaction
  const psbt = new bitcoin.Psbt({ network: TESTNET });
  psbt.addOutput({ address: gateway, value: amount });
  if (memo.length > 0) {
    const embed = bitcoin.payments.embed({ data: [memo] });
    if (!embed.output) throw new Error("Unable to embed memo");
    psbt.addOutput({ script: embed.output, value: memoAmount });
  }
  if (change > 0) {
    psbt.addOutput({ address, value: change });
  }

  for (let i = 0; i < pickUtxos.length; i++) {
    const utxo = pickUtxos[i];
    const witnessUtxo = {
      script: Buffer.from(txs[i].vout[utxo.vout].scriptpubkey, "hex"),
      value: utxo.value,
    };

    const inputData = {
      hash: txs[i].txid || "",
      index: utxo.vout || 0,
      witnessUtxo,
    };

    inputData.witnessUtxo = witnessUtxo;
    psbt.addInput(inputData);
  }
  for (let i = 0; i < pickUtxos.length; i++) {
    psbt.signInput(i, key);
  }

  psbt.finalizeAllInputs();
  return psbt.extractTransaction().toHex();
};
