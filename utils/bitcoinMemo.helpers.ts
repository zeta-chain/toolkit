import axios from "axios";
import * as bitcoin from "bitcoinjs-lib";

import type { BtcTxById, BtcUtxo } from "../types/bitcoin.types";

interface GasPriceResponse {
  GasPrice: {
    median_index: string;
    prices: string[];
  };
}

const errorTooLong =
  "Invalid memo: too long. Please, use less than 80 bytes (including the 20 bytes of the receiver address) or use inscription.";

const errorNoReceiver =
  "Invalid memo: first 20 bytes of the data should be EVM receiver address on ZetaChain";

export const getDepositFee = async (api: string) => {
  try {
    const response = await axios.get<GasPriceResponse>(`${api}`);
    const gasPrice = response.data.GasPrice;
    const medianIndex = parseInt(gasPrice.median_index);
    const medianGasPrice = parseInt(gasPrice.prices[medianIndex]);
    return medianGasPrice * 68;
  } catch (error) {
    console.error("Error fetching gas price:", error);
    throw error;
  }
};

export const bitcoinMakeTransactionWithMemo = async (
  gateway: string,
  key: bitcoin.Signer,
  amount: number,
  fee: number,
  utxos: BtcUtxo[],
  address: string,
  api: string,
  m: string = ""
) => {
  const TESTNET = bitcoin.networks.testnet;
  const memo = Buffer.from(m, "hex");

  if (!memo || memo.length < 20) throw new Error(errorNoReceiver);
  if (memo.length > 80) throw new Error(errorTooLong);

  utxos.sort((a, b) => a.value - b.value); // sort by value, ascending
  const totalAmount = amount + fee;
  const memoAmount = 0; // Use 0 satoshis for OP_RETURN output
  const total = amount + totalAmount;
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
