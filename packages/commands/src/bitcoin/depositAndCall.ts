import confirm from "@inquirer/confirm";
import axios from "axios";
import * as bitcoin from "bitcoinjs-lib";
import { Command } from "commander";
import ECPairFactory from "ecpair";
import { ethers } from "ethers";
import * as ecc from "tiny-secp256k1";

import { Transaction, UTXO } from "../../../../types/bitcoin.types";
import {
  bitcoinEncode,
  EncodingFormat,
  OpCode,
  trimOx,
} from "../../../client/src/bitcoinEncode";

bitcoin.initEccLib(ecc);

const SIGNET = {
  bech32: "tb",
  bip32: { private: 0x04358394, public: 0x043587cf },
  messagePrefix: "\x18Bitcoin Signed Message:\n",
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef,
};

const LEAF_VERSION_TAPSCRIPT = 0xc0;

const compactSize = (n: number) => {
  if (n < 0xfd) return Buffer.from([n]);
  const buf = Buffer.alloc(3);
  buf.writeUInt8(0xfd, 0);
  buf.writeUInt16LE(n, 1);
  return buf;
};

const buildRevealWitness = (leafScript: Buffer, controlBlock: Buffer) => {
  const sig = Buffer.alloc(64);

  const stack = [sig, leafScript, controlBlock];
  const parts = [compactSize(stack.length)];
  for (const item of stack) {
    parts.push(compactSize(item.length));
    parts.push(item);
  }
  return Buffer.concat(parts);
};

interface depositAndCallOptions {
  amount: string;
  api: string;
  gateway: string;
  privateKey: string;
  receiver: string;
  revertAddress: string;
  types: string[];
  values: string[];
}

const makeCommitTransaction = async (
  key: bitcoin.Signer,
  utxos: UTXO[],
  changeAddress: string,
  inscriptionData: Buffer,
  api: string,
  amountSat: number,
  feeSat = 15000
) => {
  const DUST_THRESHOLD_P2TR = 330;
  if (amountSat < DUST_THRESHOLD_P2TR) throw new Error("Amount below dust");

  /* pick utxos */
  utxos.sort((a, b) => a.value - b.value);
  let inTotal = 0;
  const picks: UTXO[] = [];
  for (const u of utxos) {
    inTotal += u.value;
    picks.push(u);
    if (inTotal >= amountSat + feeSat) break;
  }
  if (inTotal < amountSat + feeSat) throw new Error("Not enough funds");
  const changeSat = inTotal - amountSat - feeSat;

  /* leaf script */
  const leafScript = bitcoin.script.compile([
    key.publicKey.slice(1, 33),
    bitcoin.opcodes.OP_CHECKSIG,
    bitcoin.opcodes.OP_FALSE,
    bitcoin.opcodes.OP_IF,
    inscriptionData,
    bitcoin.opcodes.OP_ENDIF,
  ]);

  /* p2tr */
  const { output: commitScript, witness } = bitcoin.payments.p2tr({
    internalPubkey: key.publicKey.slice(1, 33),
    network: SIGNET,
    redeem: { output: leafScript, redeemVersion: LEAF_VERSION_TAPSCRIPT },
    scriptTree: { output: leafScript },
  });
  if (!commitScript || !witness) throw new Error("taproot build failed");

  const psbt = new bitcoin.Psbt({ network: SIGNET });
  psbt.addOutput({ script: commitScript, value: amountSat });
  if (changeSat > 0)
    psbt.addOutput({ address: changeAddress, value: changeSat });
  for (const u of picks) {
    const tx = (await axios.get<Transaction>(`${api}/tx/${u.txid}`)).data;
    psbt.addInput({
      hash: u.txid,
      index: u.vout,
      witnessUtxo: {
        script: Buffer.from(tx.vout[u.vout].scriptpubkey, "hex"),
        value: u.value,
      },
    });
  }
  psbt.signAllInputs(key);
  psbt.finalizeAllInputs();

  return {
    controlBlock: witness[witness.length - 1],
    internalKey: key.publicKey.slice(1, 33),
    leafScript,
    txHex: psbt.extractTransaction().toHex(),
  };
};

const makeRevealTransaction = (
  commitTxId: string,
  commitVout: number,
  commitValue: number,
  to: string,
  feeRate: number,
  commitData: { controlBlock: Buffer; internalKey: Buffer; leafScript: Buffer },
  key: bitcoin.Signer
) => {
  const psbt = new bitcoin.Psbt({ network: SIGNET });
  const { output: commitScript } = bitcoin.payments.p2tr({
    internalPubkey: commitData.internalKey,
    network: SIGNET,
    scriptTree: { output: commitData.leafScript },
  });
  psbt.addInput({
    hash: commitTxId,
    index: commitVout,
    tapLeafScript: [
      {
        controlBlock: commitData.controlBlock,
        leafVersion: LEAF_VERSION_TAPSCRIPT,
        script: commitData.leafScript,
      },
    ],
    witnessUtxo: { script: commitScript!, value: commitValue },
  });

  const witness = buildRevealWitness(
    commitData.leafScript,
    commitData.controlBlock
  );
  const txOverhead = 10; // version+locktime
  const inputVbytes = 36 + 1 + 43 + Math.ceil(witness.length / 4); // txin + marker+flag + varint scriptSig len (0) + sequence + witness weight/4
  const outputVbytes = 31; // p2wpkh output (approx)
  const vsize = txOverhead + inputVbytes + outputVbytes;
  const feeSat = Math.ceil(vsize * feeRate);

  const DUST_THRESHOLD_P2WPKH = 294;
  if (commitValue - feeSat < DUST_THRESHOLD_P2WPKH)
    throw new Error("reveal would be dust");

  psbt.addOutput({ address: to, value: commitValue - feeSat });

  psbt.signInput(0, key);
  psbt.finalizeAllInputs();

  return psbt.extractTransaction(true).toHex();
};

const main = async (options: depositAndCallOptions) => {
  const ECPair = ECPairFactory(ecc);
  const pk = options.privateKey;
  if (!pk) throw new Error("missing private key");
  const key = ECPair.fromPrivateKey(Buffer.from(pk, "hex"), {
    network: SIGNET,
  });
  const { address } = bitcoin.payments.p2wpkh({
    network: SIGNET,
    pubkey: key.publicKey,
  });

  const utxos = (
    await axios.get<UTXO[]>(`${options.api}/address/${address}/utxo`)
  ).data;
  const encodedPayload = new ethers.AbiCoder().encode(
    options.types,
    options.values
  );
  const inscriptionData = Buffer.from(
    bitcoinEncode(
      options.receiver,
      Buffer.from(trimOx(encodedPayload), "hex"),
      options.revertAddress,
      OpCode.DepositAndCall,
      EncodingFormat.EncodingFmtABI
    ),
    "hex"
  );
  const amountSat = Number(
    ethers.toNumber(ethers.parseUnits(options.amount, 8))
  );

  console.log(`
Network: Signet
Amount: ${options.amount} BTC
Gateway: ${options.gateway}
Universal Contract: ${options.receiver}
Revert Address: ${options.revertAddress}
Operation: DepositAndCall
Encoded Message: ${encodedPayload}
Encoding Format: ABI
Raw Inscription Data: ${inscriptionData.toString("hex")}
`);
  await confirm({ message: "Proceed?" }, { clearPromptOnDone: true });

  const commit = await makeCommitTransaction(
    key,
    utxos,
    address!,
    inscriptionData,
    options.api,
    amountSat
  );
  const commitTxid = (
    await axios.post<string>(`${options.api}/tx`, commit.txHex, {
      headers: { "Content-Type": "text/plain" },
    })
  ).data;
  console.log("Commit TXID:", commitTxid);

  const revealHex = makeRevealTransaction(
    commitTxid,
    0,
    amountSat,
    options.gateway,
    10,
    {
      controlBlock: commit.controlBlock,
      internalKey: commit.internalKey,
      leafScript: commit.leafScript,
    },
    key
  );
  const revealTxid = (
    await axios.post<string>(`${options.api}/tx`, revealHex, {
      headers: { "Content-Type": "text/plain" },
    })
  ).data;
  console.log("Reveal TXID:", revealTxid);
};

export const depositAndCallCommand = new Command()
  .name("deposit-and-call")
  .description(
    "Deposit BTC and call a contract on ZetaChain (using inscriptions)"
  )
  .requiredOption("-r, --receiver <address>", "ZetaChain receiver address")
  .requiredOption(
    "-g, --gateway <address>",
    "Bitcoin gateway (TSS) address",
    "tb1qy9pqmk2pd9sv63g27jt8r657wy0d9ueeh0nqur"
  )
  .requiredOption("-t, --types <types...>", "ABI types")
  .requiredOption("-v, --values <values...>", "Values corresponding to types")
  .requiredOption("-a, --revert-address <address>", "Revert address")
  .requiredOption("--amount <btcAmount>", "BTC amount to inscribe (in BTC)")
  .option("--api <url>", "Bitcoin API", "https://mempool.space/signet/api")
  .requiredOption("--private-key <key>", "Bitcoin private key")
  .action(main);
