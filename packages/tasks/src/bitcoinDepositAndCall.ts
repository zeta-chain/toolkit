import confirm from "@inquirer/confirm";
import axios from "axios";
import * as bitcoin from "bitcoinjs-lib";
import * as dotenv from "dotenv";
import ECPairFactory from "ecpair";
import { ethers } from "ethers";
import { task } from "hardhat/config";
import * as ecc from "tiny-secp256k1";
import { z } from "zod";

import { validateAndParseSchema } from "../../../utils";
dotenv.config();

interface BtcUtxo {
  status: {
    block_hash: string;
    block_height: number;
    block_time: number;
    confirmed: boolean;
  };
  txid: string;
  value: number;
  vout: number;
}

interface BtcVout {
  scriptpubkey: string; // The scriptpubkey is a hex-encoded string
  value: number; // The value of the output in satoshis
}

interface BtcTxById {
  fee: number;
  locktime: number;
  size: number;
  status: {
    block_hash: string;
    block_height: number;
    block_time: number;
    confirmed: boolean;
  };
  txid: string;
  version: number;
  vin: [];
  vout: BtcVout[];
  weight: number;
}

const makeTransaction = async (
  to: string,
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

const bitcoinDepositAndCallArgsSchema = z.object({
  amount: z.string(),
  api: z.string(),
  memo: z.string().optional(),
  privateKey: z.string().optional(),
  recipient: z.string(),
});

type BtcDepositAndCallArgs = z.infer<typeof bitcoinDepositAndCallArgsSchema>;

const main = async (args: BtcDepositAndCallArgs) => {
  const TESTNET = bitcoin.networks.testnet;

  const parsedArgs = validateAndParseSchema(
    args,
    bitcoinDepositAndCallArgsSchema
  );

  const pk = parsedArgs.privateKey || process.env.BTC_PRIVATE_KEY;

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

  const utxoResponse = await axios.get<BtcUtxo[]>(
    `${args.api}/address/${address}/utxo`
  );
  const utxos = utxoResponse.data;

  const tx = await makeTransaction(
    args.recipient,
    key,
    ethers.toNumber(ethers.parseUnits(args.amount, 8)),
    utxos,
    address,
    parsedArgs.api,
    parsedArgs.memo
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
