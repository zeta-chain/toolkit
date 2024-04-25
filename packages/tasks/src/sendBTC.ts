import confirm from "@inquirer/confirm";
import { getEndpoints } from "@zetachain/networks";
import * as bitcoin from "bitcoinjs-lib";
import * as dotenv from "dotenv";
import ECPairFactory from "ecpair";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as ecc from "tiny-secp256k1";

dotenv.config();

type UTXO = {
  txid: string;
  value: number;
  vout: number;
};

const decodeTransaction = async (tx: any) => {
  const API = getEndpoints("blockcypher", "btc_testnet")[0].url;

  const p1 = await fetch(`${API}/txs/decode`, {
    body: JSON.stringify({ tx }),
    method: "POST",
  });
  return await p1.json();
};

const fetchUtxos = async (address: string): Promise<UTXO[]> => {
  const API = getEndpoints("esplora", "btc_testnet")[0].url;

  const response = await fetch(`${API}/address/${address}/utxo`);
  return response.json();
};

const makeTransaction = async (
  to: string,
  key: any,
  amount: any,
  utxos: any,
  address: string,
  m: string = ""
) => {
  const API = getEndpoints("esplora", "btc_testnet")[0].url;
  const TESTNET = bitcoin.networks.testnet;
  const memo = Buffer.from(m, "hex");

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
    if (!embed.output) throw new Error("Unable to embed memo");
    psbt.addOutput({ script: embed.output, value: 0 });
  }
  if (change > 0) {
    psbt.addOutput({ address, value: change });
  }

  for (let i = 0; i < pickUtxos.length; i++) {
    const utxo = pickUtxos[i];
    const inputData = { hash: "", index: 0, witnessUtxo: {} };
    inputData.hash = txs[i].txid;
    inputData.index = utxo.vout;
    const witnessUtxo = {
      script: Buffer.from(txs[i].vout[utxo.vout].scriptpubkey, "hex"),
      value: utxo.value,
    };
    inputData.witnessUtxo = witnessUtxo;
    psbt.addInput(inputData as any);
  }
  for (let i = 0; i < pickUtxos.length; i++) {
    psbt.signInput(i, key);
  }

  psbt.finalizeAllInputs();
  return psbt.extractTransaction().toHex();
};

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const TESTNET = bitcoin.networks.testnet;
  const API = getEndpoints("blockcypher", "btc_testnet")[0].url;

  const pk = process.env.PRIVATE_KEY as any;
  if (!pk) {
    throw new Error(
      "Cannot find a private key, please set the PRIVATE_KEY env variable"
    );
  }

  const ECPair = ECPairFactory(ecc);
  const key = ECPair.fromPrivateKey(Buffer.from(pk, "hex"), {
    network: TESTNET,
  });
  const { address } = bitcoin.payments.p2wpkh({
    network: TESTNET,
    pubkey: key.publicKey,
  });
  if (address === undefined) throw new Error("Address is undefined");

  const utxos = await fetchUtxos(address);

  const tx = await makeTransaction(
    args.recipient,
    key,
    parseFloat(args.amount) * 100000000,
    utxos,
    address,
    args.memo
  );
  const decoded = JSON.stringify(await decodeTransaction(tx), null, 2);

  if (args.verboseOutput) {
    console.log(`Transaction:

${decoded}

Encoded transaction:

${tx}
`);
  }

  console.log(`
Networks:        btc_testnet → zeta_testnet
Amount:          ${args.amount} tBTC
Amount received: ${args.amount} ZRC-20 tBTC
From address:    ${address}
To address:      ${args.recipient}
Memo:            ${args.memo}
`);

  await confirm(
    {
      message: `Please, confirm the transaction`,
    },
    { clearPromptOnDone: true }
  );

  const p1 = await fetch(`${API}/txs/push`, {
    body: JSON.stringify({ tx }),
    method: "POST",
  });
  const data = await p1.json();
  const txhash = data?.tx?.hash;
  console.log(`Transaction hash: ${txhash}`);
};

export const sendBTCTask = task(
  "send-btc",
  "Deposit Bitcoin to and call contracts on ZetaChain",
  main
)
  .addParam("recipient", "Address to send to")
  .addParam("amount", "Amount to send")
  .addOptionalParam("memo", "Memo to embed in transaction")
  .addFlag("verboseOutput", "Verbose output");
