import { Command } from "commander";
import { ethers } from "ethers";
import * as bitcoin from "bitcoinjs-lib";
import axios from "axios";
import * as dotenv from "dotenv";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";
import confirm from "@inquirer/confirm";
import {
  bitcoinEncode,
  OpCode,
  EncodingFormat,
  trimOx,
} from "../../../client/src/bitcoinEncode";

dotenv.config();

// Initialize ECC library for bitcoinjs-lib
bitcoin.initEccLib(ecc);

// Define signet network
const SIGNET = {
  messagePrefix: "\x18Bitcoin Signed Message:\n",
  bech32: "tb",
  bip32: {
    public: 0x043587cf,
    private: 0x04358394,
  },
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef,
};

interface InscriptionOptions {
  receiver: string;
  gateway: string;
  revertAddress: string;
  types: string[];
  values: string[];
  amount: string;
  api: string;
  privateKey?: string;
}

const makeCommitTransaction = async (
  key: bitcoin.Signer,
  utxos: any[],
  address: string,
  api: string
) => {
  utxos.sort((a, b) => a.value - b.value);
  const fee = 15000;
  const total = fee;
  let sum = 0;
  const pickUtxos = [];
  for (let i = 0; i < utxos.length; i++) {
    sum += utxos[i].value;
    pickUtxos.push(utxos[i]);
    if (sum >= total) break;
  }

  if (sum < total) throw new Error("Not enough funds");
  const change = sum - total;

  const psbt = new bitcoin.Psbt({ network: SIGNET });

  // Create a P2TR output for the commit transaction
  const commitOutput = bitcoin.payments.p2tr({
    internalPubkey: key.publicKey.slice(1, 33),
    network: SIGNET,
  });

  if (!commitOutput.output) throw new Error("Failed to create commit output");

  psbt.addOutput({ script: commitOutput.output, value: 1000 }); // Small amount for the commit
  if (change > 0) psbt.addOutput({ address, value: change });

  for (const utxo of pickUtxos) {
    const txData = (await axios.get(`${api}/tx/${utxo.txid}`)).data;
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: Buffer.from(txData.vout[utxo.vout].scriptpubkey, "hex"),
        value: utxo.value,
      },
    });
  }

  for (let i = 0; i < pickUtxos.length; i++) psbt.signInput(i, key);

  psbt.finalizeAllInputs();

  return {
    txHex: psbt.extractTransaction().toHex(),
    internalKey: key.publicKey.slice(1, 33),
    outputScript: commitOutput.output,
  };
};

const makeRevealTransaction = async (
  to: string,
  key: bitcoin.Signer,
  amount: number,
  inscriptionData: Buffer,
  commitTxId: string,
  commitVout: number,
  commitValue: number,
  commitData: { internalKey: Buffer; outputScript: Buffer },
  address: string,
  api: string
) => {
  const psbt = new bitcoin.Psbt({ network: SIGNET });

  const inscriptionOutput = bitcoin.payments.p2tr({
    internalPubkey: key.publicKey.slice(1, 33),
    scriptTree: {
      output: bitcoin.script.compile([
        bitcoin.opcodes.OP_FALSE,
        bitcoin.opcodes.OP_IF,
        inscriptionData,
        bitcoin.opcodes.OP_ENDIF,
      ]),
    },
    network: SIGNET,
  });

  if (!inscriptionOutput.output)
    throw new Error("Failed to create inscription output");

  psbt.addOutput({ script: inscriptionOutput.output, value: amount });
  if (commitValue - amount > 0)
    psbt.addOutput({ address, value: commitValue - amount });

  // Add the commit transaction output as input
  psbt.addInput({
    hash: commitTxId,
    index: commitVout,
    witnessUtxo: {
      script: commitData.outputScript,
      value: commitValue,
    },
    tapInternalKey: commitData.internalKey,
  });

  // Sign the input
  psbt.signInput(0, key);

  psbt.finalizeAllInputs();

  return psbt.extractTransaction().toHex();
};

const main = async (options: InscriptionOptions) => {
  const ECPair = ECPairFactory(ecc);
  const pk = options.privateKey || process.env.BTC_PRIVATE_KEY;

  if (!pk) throw new Error("Missing private key");

  const key = ECPair.fromPrivateKey(Buffer.from(pk, "hex"), {
    network: SIGNET,
  });
  const { address } = bitcoin.payments.p2wpkh({
    network: SIGNET,
    pubkey: key.publicKey,
  });

  const utxos = (await axios.get(`${options.api}/address/${address}/utxo`))
    .data;

  const encodedPayload = new ethers.AbiCoder().encode(
    options.types,
    options.values
  );
  const payloadBuffer = Buffer.from(trimOx(encodedPayload), "hex");

  const inscriptionPayload = bitcoinEncode(
    options.receiver,
    payloadBuffer,
    options.revertAddress,
    OpCode.DepositAndCall,
    EncodingFormat.EncodingFmtABI
  );

  console.log(`
Preparing inscription transactions
Amount: ${options.amount} BTC
To gateway address: ${options.gateway}
ZetaChain receiver: ${options.receiver}
`);

  await confirm(
    { message: `Confirm the inscription transactions?` },
    { clearPromptOnDone: true }
  );

  // Create and broadcast commit transaction
  const commitResult = await makeCommitTransaction(
    key,
    utxos,
    address!,
    options.api
  );
  const commitResponse = await axios.post(
    `${options.api}/tx`,
    commitResult.txHex,
    {
      headers: { "Content-Type": "text/plain" },
    }
  );
  console.log(`Commit transaction broadcasted: ${commitResponse.data}`);

  // Create and broadcast reveal transaction
  const revealTx = await makeRevealTransaction(
    options.gateway,
    key,
    ethers.toNumber(ethers.parseUnits(options.amount, 8)),
    Buffer.from(inscriptionPayload, "hex"),
    commitResponse.data,
    0, // commitVout
    1000, // commitValue
    {
      internalKey: commitResult.internalKey,
      outputScript: commitResult.outputScript,
    },
    address!,
    options.api
  );
  const revealResponse = await axios.post(`${options.api}/tx`, revealTx, {
    headers: { "Content-Type": "text/plain" },
  });
  console.log(`Reveal transaction broadcasted: ${revealResponse.data}`);
};

export const inscriptionCommand = new Command()
  .name("inscription")
  .description("Send Bitcoin Inscription transaction for ZetaChain")
  .requiredOption("-r, --receiver <address>", "ZetaChain receiver address")
  .requiredOption(
    "-g, --gateway <address>",
    "Bitcoin gateway address",
    "tb1qy9pqmk2pd9sv63g27jt8r657wy0d9ueeh0nqur"
  )
  .requiredOption("-t, --types <types...>", "ABI types")
  .requiredOption("-v, --values <values...>", "Values corresponding to types")
  .requiredOption("-a, --revert-address <address>", "Revert address")
  .requiredOption("--amount <btcAmount>", "BTC amount to send (in BTC)")
  .option("--api <url>", "Bitcoin API", "https://mempool.space/signet/api")
  .option("--private-key <key>", "Bitcoin private key")
  .action(main);
