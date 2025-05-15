import axios from "axios";
import * as bitcoin from "bitcoinjs-lib";

import type { BtcTxById, BtcUtxo } from "../types/bitcoin.types";

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

  if (memo.length >= 78) throw new Error("Memo too long");
  utxos.sort((a, b) => a.value - b.value); // sort by value, ascending
  const fee = 10000;
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
