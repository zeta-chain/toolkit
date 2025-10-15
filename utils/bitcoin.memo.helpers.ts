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

export const bitcoinBuildUnsignedPsbtWithMemo = async (
  params: BitcoinTxParams
) => {
  if (!params.network) {
    throw new Error("Missing Bitcoin network (mainnet | signet).");
  }

  const NETWORK =
    params.network === "mainnet"
      ? bitcoin.networks.bitcoin
      : bitcoin.networks.testnet;
  const memo = Buffer.from(params.memo || "", "hex");

  if (memo.length < EVM_ADDRESS_LENGTH) throw new Error(errorNoReceiver);
  if (memo.length > MAX_MEMO_LENGTH) throw new Error(errorMemoTooLong);

  const sortedUtxos = params.utxos.sort((a, b) => a.value - b.value);
  const need = params.amount + params.depositFee + params.networkFee;
  let sum = 0;
  const picked: BtcUtxo[] = [];
  for (const u of sortedUtxos) {
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

  const psbt = new bitcoin.Psbt({ network: NETWORK });

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

  return {
    pickedUtxos: picked,
    psbt,
  };
};

export const bitcoinSignAndFinalizeTransactionWithMemo = ({
  psbt,
  key,
  pickedUtxos,
}: {
  key: bitcoin.Signer;
  pickedUtxos: BtcUtxo[];
  psbt: bitcoin.Psbt;
}) => {
  pickedUtxos.forEach((_, i) => psbt.signInput(i, key));
  psbt.finalizeAllInputs();

  return psbt.extractTransaction().toHex();
};

/**
 * Constructs and validates a memo string from receiver address and data
 * @param receiver - The receiver address (hex string, with or without 0x prefix)
 * @param data - The data to include in the memo (hex string, with or without 0x prefix)
 * @returns The constructed memo string
 * @throws Error if the combined length exceeds 80 bytes
 */
export const constructMemo = (receiver: string, data?: string): string => {
  const strip0x = (s: string) => (s?.startsWith("0x") ? s.slice(2) : s || "");
  const isEvenHex = (s: string) =>
    s.length % 2 === 0 && /^[0-9a-fA-F]*$/.test(s);

  const cleanReceiver = strip0x(receiver);
  const cleanData = strip0x(data ?? "");

  if (
    cleanReceiver.length !== EVM_ADDRESS_LENGTH * 2 ||
    !isEvenHex(cleanReceiver)
  ) {
    throw new Error(
      "Invalid receiver: must be a 20-byte (40-hex) EVM address."
    );
  }
  if (cleanData && !isEvenHex(cleanData)) {
    throw new Error("Invalid data: must be an even-length hex string.");
  }

  const receiverLength = cleanReceiver.length / 2;
  const dataLength = cleanData.length / 2;
  const totalLength = receiverLength + dataLength;

  if (totalLength > MAX_MEMO_LENGTH) {
    throw new Error(
      `Memo too long: ${totalLength} bytes. Maximum allowed is ${MAX_MEMO_LENGTH} bytes (receiver + data).`
    );
  }

  return cleanReceiver + cleanData;
};
