import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as bitcoin from "bitcoinjs-lib";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";
import * as dotenv from "dotenv";

dotenv.config();

const TESTNET = bitcoin.networks.testnet;

const API = "https://blockstream.info/testnet/api";
const ENDPOINT = "https://api.blockcypher.com/v1/btc/test3/txs/push";

type UTXO = {
  txid: string;
  vout: number;
  value: number;
};

async function fetchUtxos(address: string): Promise<UTXO[]> {
  const response = await fetch(`${API}/address/${address}/utxo`);
  return response.json();
}

async function fetchTransactionData(txid: string) {
  const response = await fetch(`${API}/tx/${txid}`);
  return response.json();
}

async function signTransactionInputs(
  psbt: bitcoin.Psbt,
  utxos: UTXO[],
  key: any
) {
  for (let i = 0; i < utxos.length; i++) {
    const utxo = utxos[i];
    const transactionData = await fetchTransactionData(utxo.txid);
    const inputData = {
      hash: transactionData.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: Buffer.from(
          transactionData.vout[utxo.vout].scriptpubkey,
          "hex"
        ),
        value: utxo.value,
      },
    };
    psbt.addInput(inputData);
    psbt.signInput(i, key);
  }
  psbt.finalizeAllInputs();
}

async function makeTransaction(
  to: string,
  pk: any,
  amount: number,
  utxos: UTXO[],
  memo: string = ""
) {
  const ECPair = ECPairFactory(ecc);
  const key = ECPair.fromPrivateKey(Buffer.from(pk, "hex"), {
    network: TESTNET,
  });
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: key.publicKey,
    network: TESTNET,
  });

  if (memo.length >= 78) throw new Error("Memo too long");

  utxos.sort((a, b) => a.value - b.value); // sort by value, ascending
  const fee = 10000;
  const total = amount + fee;
  let sum = 0;
  const pickedUtxos = utxos.filter((utxo) => {
    sum += utxo.value;
    return sum >= total;
  });

  if (sum < total) throw new Error("Not enough funds");

  const change = sum - total;

  const psbt = new bitcoin.Psbt({ network: TESTNET });
  psbt.addOutput({ address: to, value: amount });

  if (memo.length > 0) {
    const embed = bitcoin.payments.embed({
      data: [Buffer.from(memo, "utf-8")],
    });
    psbt.addOutput({ script: embed.output as Buffer, value: 0 });
  }
  if (change > 0) {
    psbt.addOutput({ address: address as string, value: change });
  }

  await signTransactionInputs(psbt, pickedUtxos, key);

  return psbt.extractTransaction().toHex();
}

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const pk = process.env.PRIVATE_KEY as any;
  const ECPair = ECPairFactory(ecc);
  const key = ECPair.fromPrivateKey(Buffer.from(pk, "hex"), {
    network: TESTNET,
  });
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: key.publicKey,
    network: TESTNET,
  });

  const utxos = await fetchUtxos(address);

  const tx = await makeTransaction(
    args.recipient,
    pk,
    parseInt(args.amount),
    utxos,
    args.memo
  );
  console.log(tx);
  const p1 = await fetch(ENDPOINT, {
    method: "POST",
    body: JSON.stringify({ tx }),
  });
  const data = await p1.json();
  console.log("data", data);
};

export const btcTask = task("btc", "", main)
  .addParam("recipient")
  .addParam("amount")
  .addOptionalParam("memo");
