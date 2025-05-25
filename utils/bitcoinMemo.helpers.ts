import axios from "axios";
import * as bitcoin from "bitcoinjs-lib";

import {
  ESTIMATED_VIRTUAL_SIZE,
  EVM_ADDRESS_LENGTH,
  MAX_MEMO_LENGTH,
} from "../types/bitcoin.constants";
import type {
  BitcoinTxParams,
  BtcTxById,
  BtcUtxo,
} from "../types/bitcoin.types";

interface GasPriceResponse {
  GasPrice: {
    median_index: string;
    prices: string[];
  };
}

const errorMemoTooLong =
  "Invalid memo: too long. Please, use less than 80 bytes (including the 20 bytes of the receiver address) or use inscription.";

const errorNoReceiver =
  "Invalid memo: first 20 bytes of the data should be EVM receiver address on ZetaChain";

export const getDepositFee = async (api: string) => {
  try {
    const response = await axios.get<GasPriceResponse>(`${api}`);
    const gasPrice = response.data.GasPrice;
    const medianIndex = parseInt(gasPrice.median_index);
    const medianGasPrice = parseInt(gasPrice.prices[medianIndex]);
    return medianGasPrice * ESTIMATED_VIRTUAL_SIZE;
  } catch (error) {
    console.error("Error fetching gas price:", error);
    throw error;
  }
};

export const bitcoinMakeTransactionWithMemo = async (
  params: BitcoinTxParams
) => {
  const TESTNET = bitcoin.networks.testnet;
  const memo = Buffer.from(params.memo || "", "hex");

  if (memo.length < EVM_ADDRESS_LENGTH) throw new Error(errorNoReceiver);
  if (memo.length > MAX_MEMO_LENGTH) throw new Error(errorMemoTooLong);

  params.utxos.sort((a, b) => a.value - b.value);
  const need = params.amount + params.depositFee + params.networkFee;
  let sum = 0;
  const picked: BtcUtxo[] = [];
  for (const u of params.utxos) {
    sum += u.value;
    picked.push(u);
    if (sum >= need) break;
  }
  if (sum < need) throw new Error("Not enough funds");

  const change = sum - params.amount - params.depositFee - params.networkFee;

  const prevTxs = await Promise.all(
    picked.map((u) =>
      axios.get<BtcTxById>(`${params.api}/tx/${u.txid}`).then((r) => r.data)
    )
  );

  const psbt = new bitcoin.Psbt({ network: TESTNET });

  psbt.addOutput({
    address: params.gateway,
    value: params.amount + params.depositFee,
  });

  const embed = bitcoin.payments.embed({ data: [memo] });
  if (!embed.output) throw new Error("Unable to embed memo");
  psbt.addOutput({ script: embed.output, value: 0 });

  if (change > 0) {
    psbt.addOutput({ address: params.address, value: change });
  }

  picked.forEach((u, i) => {
    psbt.addInput({
      hash: prevTxs[i].txid,
      index: u.vout,
      witnessUtxo: {
        script: Buffer.from(prevTxs[i].vout[u.vout].scriptpubkey, "hex"),
        value: u.value,
      },
    });
  });

  picked.forEach((_, i) => psbt.signInput(i, params.key));
  psbt.finalizeAllInputs();

  return psbt.extractTransaction().toHex();
};
