import confirm from "@inquirer/confirm";
import * as bitcoin from "bitcoinjs-lib";
import * as dotenv from "dotenv";
import ECPairFactory from "ecpair";
import { ethers } from "ethers";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as ecc from "tiny-secp256k1";

dotenv.config();

const makeTransaction = async (
  to: string,
  key: any,
  amount: any,
  utxos: any,
  address: string,
  api: string,
  m: string = ""
) => {
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
    const p1 = await fetch(`${api}/tx/${utxo.txid}`);
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

  const pk = args.privateKey || (process.env.BTC_PRIVATE_KEY as any);
  if (!pk) {
    throw new Error(
      "Cannot find a private key, please pass --private-key or set the BTC_PRIVATE_KEY env variable"
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

  const utxoResponse = await fetch(`${args.api}/address/${address}/utxo`);
  const utxos = await utxoResponse.json();

  const tx = await makeTransaction(
    args.recipient,
    key,
    ethers.utils.parseUnits(args.amount, 8).toNumber(),
    utxos,
    address,
    args.api,
    args.memo
  );

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

  const broadcastTx = async (tx: string) => {
    const response = await fetch(`${args.api}/tx`, {
      body: tx,
      headers: { "Content-Type": "text/plain" },
      method: "POST",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transaction broadcast failed: ${errorText}`);
    }

    return await response.text();
  };

  const txhash = await broadcastTx(tx);
  console.log(`Transaction hash: ${txhash}`);
};

export const bitcoinDepositAndCallTask = task(
  "bitcoin-deposit-and-call",
  "Deposit Bitcoin and call contracts on ZetaChain (testnet 4 only)",
  main
)
  .addParam("recipient", "Address to send to")
  .addParam("amount", "Amount to send")
  .addOptionalParam("memo", "Memo to embed in transaction")
  .addOptionalParam("api", "Bitcoin API", "https://mempool.space/testnet4/api")
  .addOptionalParam("privateKey", "Private key");
