import confirm from "@inquirer/confirm";
import axios from "axios";
import * as bitcoin from "bitcoinjs-lib";
import { Command, Option } from "commander";
import ECPairFactory, { ECPairInterface } from "ecpair";
import { ethers } from "ethers";
import * as ecc from "tiny-secp256k1";

import { BitcoinAccountData } from "../types/accounts.types";
import {
  BITCOIN_FEES,
  DEFAULT_BITCOIN_API,
  DEFAULT_GAS_PRICE_API,
  DEFAULT_GATEWAY,
} from "../types/bitcoin.constants";
import { type BtcUtxo, formatEncodingChoices } from "../types/bitcoin.types";
import { DEFAULT_ACCOUNT_NAME } from "../types/shared.constants";
import { EncodingFormat } from "../utils/bitcoinEncode";
import { getAccountData } from "./accounts";
import {
  makeCommitTransaction,
  makeRevealTransaction,
  SIGNET,
} from "./bitcoin.helpers";
import { handleError } from "./handleError";

export interface BitcoinKeyPair {
  address: string;
  key: ECPairInterface;
}

export interface TransactionInfo {
  amount: string;
  depositFee: number;
  encodedMessage?: string;
  encodingFormat: EncodingFormat;
  gateway: string;
  inscriptionCommitFee: number;
  inscriptionRevealFee: number;
  network: string;
  operation: string;
  rawInscriptionData: string;
  receiver?: string;
  revertAddress?: string;
  sender: string;
}

/**
 * Sets up a Bitcoin key pair using either a provided private key or one stored in the account data
 */
export const setupBitcoinKeyPair = (
  privateKey: string | undefined,
  name: string
): BitcoinKeyPair => {
  const keyPrivateKey =
    privateKey ||
    getAccountData<BitcoinAccountData>("bitcoin", name)?.privateKey;

  if (!keyPrivateKey) {
    const errorMessage = handleError({
      context: "Failed to retrieve private key",
      error: new Error("Private key not found"),
      shouldThrow: false,
    });

    throw new Error(errorMessage);
  }

  // Initialize Bitcoin library with ECC implementation
  bitcoin.initEccLib(ecc);

  // Set up Bitcoin key pair
  const ECPair = ECPairFactory(ecc);
  const key = ECPair.fromPrivateKey(Buffer.from(keyPrivateKey, "hex"), {
    network: SIGNET,
  });

  const { address } = bitcoin.payments.p2wpkh({
    network: SIGNET,
    pubkey: key.publicKey,
  });

  return { address: address!, key };
};

/**
 * Fetches unspent transaction outputs (UTXOs) for the given address
 */
export const fetchUtxos = async (
  address: string,
  api: string
): Promise<BtcUtxo[]> => {
  return (await axios.get<BtcUtxo[]>(`${api}/address/${address}/utxo`)).data;
};

const formatBTC = (sats: number) => ethers.formatUnits(BigInt(sats), 8);

/**
 * Displays transaction details to the user and asks for confirmation before proceeding
 */
export const displayAndConfirmTransaction = async (info: TransactionInfo) => {
  const notApplicable = "encoded in raw inscription data";
  const amountInSats = info.amount
    ? Number(ethers.parseUnits(info.amount, 8))
    : 0;
  const totalSats =
    amountInSats +
    info.inscriptionCommitFee +
    info.inscriptionRevealFee +
    info.depositFee;

  console.log(`
Network: ${info.network}
${info.amount ? `Amount: ${info.amount} BTC (${amountInSats} sats)` : ""}
Inscription Commit Fee: ${info.inscriptionCommitFee} sats (${formatBTC(
    info.inscriptionCommitFee
  )} BTC)
Inscription Reveal Fee: ${info.inscriptionRevealFee} sats (${formatBTC(
    info.inscriptionRevealFee
  )} BTC)
Deposit Fee: ${info.depositFee} sats (${formatBTC(info.depositFee)} BTC)
Total: ${totalSats} sats (${formatBTC(totalSats)} BTC)
Gateway: ${info.gateway}
Sender: ${info.sender}
Receiver: ${info.receiver || notApplicable}
Revert Address: ${info.revertAddress || notApplicable}
Operation: ${info.operation}
${info.encodedMessage ? `Encoded Message: ${info.encodedMessage}` : ""}
Encoding Format: ${info.encodingFormat}
Raw Inscription Data: ${info.rawInscriptionData}
`);
  await confirm({ message: "Proceed?" }, { clearPromptOnDone: true });
};

/**
 * Displays memo transaction details to the user and asks for confirmation before proceeding
 */
export const displayAndConfirmMemoTransaction = async (
  amount: number,
  networkFee: number,
  depositFee: number,
  gateway: string,
  sender: string,
  memo: string
) => {
  const totalAmount = amount + depositFee;

  console.log(`
Network: Signet
Gateway: ${gateway}
Sender: ${sender}
Operation: Memo Transaction
Memo: ${memo}
Deposit Amount: ${amount} sats (${formatBTC(amount)} BTC)
Network Fee: ${networkFee} sats (${formatBTC(networkFee)} BTC)
Deposit Fee: ${depositFee} sats (${formatBTC(depositFee)} BTC)
Deposit Total: ${totalAmount} sats (${formatBTC(totalAmount)} BTC)
`);

  await confirm({ message: "Proceed?" }, { clearPromptOnDone: true });
};

/**
 * Broadcasts a raw Bitcoin transaction to the network
 */
export const broadcastBtcTransaction = async (
  txHex: string,
  api: string
): Promise<string> => {
  const { data } = await axios.post<string>(`${api}/tx`, txHex, {
    headers: { "Content-Type": "text/plain" },
  });

  return data;
};

/**
 * Creates and broadcasts both commit and reveal transactions for Bitcoin inscriptions
 */
export const createAndBroadcastTransactions = async (
  key: ECPairInterface,
  utxos: BtcUtxo[],
  address: string,
  data: Buffer,
  api: string,
  amount: number,
  gateway: string
) => {
  // Create and broadcast commit transaction
  const commit = await makeCommitTransaction(
    key,
    utxos,
    address,
    data,
    api,
    amount
  );

  const commitTxid = await broadcastBtcTransaction(commit.txHex, api);
  console.log("Commit TXID:", commitTxid);

  // Create and broadcast reveal transaction
  const revealHex = makeRevealTransaction(
    commitTxid,
    0,
    amount,
    gateway,
    BITCOIN_FEES.DEFAULT_REVEAL_FEE_RATE,
    {
      controlBlock: commit.controlBlock,
      internalKey: commit.internalKey,
      leafScript: commit.leafScript,
    },
    key
  );
  const revealTxid = await broadcastBtcTransaction(revealHex, api);
  console.log("Reveal TXID:", revealTxid);

  return { commitTxid, revealTxid };
};

export const createBitcoinCommandWithCommonOptions = (
  name: string
): Command => {
  return new Command(name)
    .option("--yes", "Skip confirmation prompt", false)
    .option("-r, --receiver <address>", "ZetaChain receiver address")
    .requiredOption(
      "-g, --gateway <address>",
      "Bitcoin gateway (TSS) address",
      DEFAULT_GATEWAY
    );
};

export const createBitcoinMemoCommandWithCommonOptions = (
  name: string
): Command => {
  return createBitcoinCommandWithCommonOptions(name)
    .option("-d, --data <data>", "Pass raw data")
    .option("--network-fee <fee>", "Network fee (in sats)", "1750");
};

export const createBitcoinInscriptionCommandWithCommonOptions = (
  name: string
): Command => {
  return createBitcoinCommandWithCommonOptions(name)
    .addOption(
      new Option("--private-key <key>", "Bitcoin private key").conflicts([
        "name",
      ])
    )
    .addOption(
      new Option("--name <name>", "Account name")
        .default(DEFAULT_ACCOUNT_NAME)
        .conflicts(["private-key"])
    )
    .option("--revert-address <address>", "Revert address")
    .addOption(
      new Option("--format <format>", "Encoding format")
        .choices(formatEncodingChoices)
        .default("ABI")
    )
    .addOption(
      new Option("--data <data>", "Pass raw data").conflicts([
        "types",
        "values",
        "revert-address",
        "receiver",
      ])
    )
    .option("--bitcoin-api <url>", "Bitcoin API", DEFAULT_BITCOIN_API)
    .option("--gas-price-api <url>", "ZetaChain API", DEFAULT_GAS_PRICE_API);
};

/**
 * Parses a Bitcoin amount string and converts it to satoshis as a number
 */
export const parseAmount = (amount: string): number => {
  const amountSatBig = ethers.parseUnits(amount, 8);
  if (amountSatBig > Number.MAX_SAFE_INTEGER) {
    throw new Error("Amount exceeds JS safe-integer range");
  }
  return Number(amountSatBig);
};

/**
 * Constructs and validates a memo string from receiver address and data
 * @param receiver - The receiver address (hex string, with or without 0x prefix)
 * @param data - The data to include in the memo (hex string, with or without 0x prefix)
 * @returns The constructed memo string
 * @throws Error if the combined length exceeds 80 bytes
 */
export const constructMemo = (receiver: string, data?: string): string => {
  const cleanReceiver = receiver.startsWith("0x")
    ? receiver.slice(2)
    : receiver;
  const cleanData = data?.startsWith("0x") ? data.slice(2) : data;

  const receiverLength = cleanReceiver.length / 2; // Divide by 2 since it's hex string
  const dataLength = cleanData ? cleanData.length / 2 : 0;
  const totalLength = receiverLength + dataLength;

  if (totalLength > 80) {
    throw new Error(
      `Memo too long: ${totalLength} bytes. Maximum allowed length is 80 bytes (including the 20 bytes of the receiver address).`
    );
  }

  return cleanReceiver + (cleanData || "");
};
