import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as bitcoin from "bitcoinjs-lib";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";
import * as dotenv from "dotenv";
import confirm from "@inquirer/confirm";

dotenv.config();

const TESTNET = bitcoin.networks.testnet;

const API = "https://blockstream.info/testnet/api";
const ENDPOINT = "https://api.blockcypher.com/v1/btc/test3/txs";

type UTXO = {
  txid: string;
  vout: number;
  value: number;
};

const decodeTransaction = async (tx: any) => {
  const endpoint = `${ENDPOINT}/decode`;

  const p1 = await fetch(endpoint, {
    method: "POST",
    body: JSON.stringify({ tx }),
  });
  return await p1.json();
};

async function fetchUtxos(address: string): Promise<UTXO[]> {
  const response = await fetch(`${API}/address/${address}/utxo`);
  return response.json();
}

async function makeTransaction(
  to: string,
  pk: any,
  amount: any,
  utxos: any,
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
  utxos.sort((a: any, b: any) => a.value - b.value); // sort by value, ascending
  const fee = 10000;
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
    const p1 = await fetch(`${API}/tx/${utxo.txid}`);
    const data = await p1.json();
    txs.push(data);
  }

  // try creating a transaction
  const psbt = new bitcoin.Psbt({ network: TESTNET });
  psbt.addOutput({ address: to, value: amount });

  if (memo.length > 0) {
    const embed = bitcoin.payments.embed({ data: [memo] });
    psbt.addOutput({ script: embed.output, value: 0 });
  }
  if (change > 0) {
    psbt.addOutput({ address, value: change });
  }

  for (let i = 0; i < pickUtxos.length; i++) {
    const utxo = pickUtxos[i];
    const inputData = {};
    inputData.hash = txs[i].txid;
    inputData.index = utxo.vout;
    const witnessUtxo = {
      script: Buffer.from(txs[i].vout[utxo.vout].scriptpubkey, "hex"),
      value: utxo.value,
    };
    inputData.witnessUtxo = witnessUtxo;
    psbt.addInput(inputData);
  }
  for (let i = 0; i < pickUtxos.length; i++) {
    psbt.signInput(i, key);
  }

  psbt.finalizeAllInputs();
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
  console.log(await decodeTransaction(tx));
  await confirm({ message: "Continue?" });
  const p1 = await fetch(`${ENDPOINT}/push`, {
    method: "POST",
    body: JSON.stringify({ tx }),
  });
  // const data = await p1.json();
};

export const btcTask = task("btc", "", main)
  .addParam("recipient")
  .addParam("amount")
  .addOptionalParam("memo");
