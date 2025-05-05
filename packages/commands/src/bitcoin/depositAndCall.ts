import confirm from "@inquirer/confirm";
import axios from "axios";
import * as bitcoin from "bitcoinjs-lib";
import { Command } from "commander";
import ECPairFactory from "ecpair";
import { ethers } from "ethers";
import * as ecc from "tiny-secp256k1";

import {
  BITCOIN_FEES,
  BITCOIN_LIMITS,
  BITCOIN_NETWORKS,
  BITCOIN_SCRIPT,
  BITCOIN_TX,
} from "../../../../types/bitcoin.constants";
import type { BtcTxById, BtcUtxo } from "../../../../types/bitcoin.types";
import {
  bitcoinEncode,
  EncodingFormat,
  OpCode,
  trimOx,
} from "../../../client/src/bitcoinEncode";

// Initialize Bitcoin library with ECC implementation
bitcoin.initEccLib(ecc);

const SIGNET = {
  bech32: BITCOIN_NETWORKS.SIGNET.BECH32,
  bip32: {
    private: BITCOIN_NETWORKS.SIGNET.BIP32.PRIVATE,
    public: BITCOIN_NETWORKS.SIGNET.BIP32.PUBLIC,
  },
  messagePrefix: BITCOIN_NETWORKS.SIGNET.MESSAGE_PREFIX,
  pubKeyHash: BITCOIN_NETWORKS.SIGNET.PUBKEY_HASH,
  scriptHash: BITCOIN_NETWORKS.SIGNET.SCRIPT_HASH,
  wif: BITCOIN_NETWORKS.SIGNET.WIF,
};

const LEAF_VERSION_TAPSCRIPT = BITCOIN_SCRIPT.LEAF_VERSION_TAPSCRIPT;

/**
 * Encodes a number as a Bitcoin compact size.
 * Bitcoin uses a custom variable-length integer format for script element counts and lengths.
 *
 * @param n - The number to encode
 * @returns A Buffer containing the compact size representation
 */
const compactSize = (n: number) => {
  if (n < BITCOIN_TX.COMPACT_SIZE.MARKER_UINT16) return Buffer.from([n]);
  const buf = Buffer.alloc(3);
  buf.writeUInt8(BITCOIN_TX.COMPACT_SIZE.MARKER_UINT16, 0);
  buf.writeUInt16LE(n, 1);
  return buf;
};

/**
 * Builds a witness stack for the reveal transaction.
 * The witness contains the data needed to reveal the inscribed data and spend the Taproot output.
 *
 * @param leafScript - The script containing the cross-chain message
 * @param controlBlock - The Taproot control block needed to validate the script path
 * @returns A Buffer containing the encoded witness data
 */
const buildRevealWitness = (leafScript: Buffer, controlBlock: Buffer) => {
  // Empty signature - we don't need a real signature as we're using the script path
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

/**
 * Creates a commit transaction that embeds cross-chain message data in a Taproot output.
 * The commit transaction creates a special UTXO that can be spent later to reveal the inscription.
 *
 * @param key - Bitcoin signer (private key)
 * @param utxos - Available UTXOs to spend
 * @param changeAddress - Address to send change to
 * @param inscriptionData - Cross-chain message data to inscribe
 * @param api - Bitcoin API endpoint for fetching transaction data
 * @param amountSat - Amount to inscribe in satoshis
 * @param feeSat - Fee for the transaction in satoshis
 * @returns Object containing transaction data and Taproot script details
 */
const makeCommitTransaction = async (
  key: bitcoin.Signer,
  utxos: BtcUtxo[],
  changeAddress: string,
  inscriptionData: Buffer,
  api: string,
  amountSat: number,
  feeSat = BITCOIN_FEES.DEFAULT_COMMIT_FEE_SAT
) => {
  const DUST_THRESHOLD_P2TR = BITCOIN_LIMITS.DUST_THRESHOLD.P2TR;
  if (amountSat < DUST_THRESHOLD_P2TR) throw new Error("Amount below dust");

  /* pick utxos */
  utxos.sort((a, b) => a.value - b.value);
  let inTotal = 0;
  const picks: BtcUtxo[] = [];
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
    const tx = (await axios.get<BtcTxById>(`${api}/tx/${u.txid}`)).data;
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

/**
 * Creates a reveal transaction that spends the commit transaction output and reveals the inscription.
 * This transaction sends funds to the ZetaChain gateway while exposing the cross-chain message.
 *
 * @param commitTxId - Transaction ID of the commit transaction
 * @param commitVout - Output index in the commit transaction to spend (typically 0)
 * @param commitValue - Value of the commit output in satoshis
 * @param to - Gateway address to send funds to
 * @param feeRate - Fee rate in satoshis per vbyte
 * @param commitData - Data from the commit transaction needed to spend it
 * @param key - Bitcoin signer (private key)
 * @returns Hex-encoded transaction ready for broadcast
 */
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
  const txOverhead = BITCOIN_TX.TX_OVERHEAD;
  const inputVbytes = 36 + 1 + 43 + Math.ceil(witness.length / 4); // txin + marker+flag + varint scriptSig len (0) + sequence + witness weight/4
  const outputVbytes = BITCOIN_TX.P2WPKH_OUTPUT_VBYTES;
  const vsize = txOverhead + inputVbytes + outputVbytes;
  const feeSat = Math.ceil(vsize * feeRate);

  const DUST_THRESHOLD_P2WPKH = BITCOIN_LIMITS.DUST_THRESHOLD.P2WPKH;
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

  // Get available UTXOs
  const utxos = (
    await axios.get<BtcUtxo[]>(`${options.api}/address/${address}/utxo`)
  ).data;

  // Encode contract call data for inscription
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

  // Convert BTC amount to satoshis
  const amountSat = Number(
    ethers.toNumber(ethers.parseUnits(options.amount, 8))
  );

  // Display transaction information and confirm
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

  // Create and broadcast commit transaction
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

  // Create and broadcast reveal transaction
  const revealHex = makeRevealTransaction(
    commitTxid,
    0,
    amountSat,
    options.gateway,
    BITCOIN_FEES.DEFAULT_REVEAL_FEE_RATE,
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
