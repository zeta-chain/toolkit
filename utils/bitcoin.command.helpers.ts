import confirm from "@inquirer/confirm";
import axios from "axios";
import * as bitcoin from "bitcoinjs-lib";
import { Command, Option } from "commander";
import ECPairFactory, { ECPairInterface } from "ecpair";
import { ethers } from "ethers";
import * as ecc from "tiny-secp256k1";

import {
  EncodingFormat,
  RevertOptions,
} from "../src/chains/bitcoin/inscription/encode";
import { BitcoinAccountData } from "../types/accounts.types";
import {
  DEFAULT_BITCOIN_API,
  DEFAULT_GAS_PRICE_API,
  DEFAULT_GATEWAY,
} from "../types/bitcoin.constants";
import { type BtcUtxo, formatEncodingChoices } from "../types/bitcoin.types";
import { DEFAULT_ACCOUNT_NAME } from "../types/shared.constants";
import { getAccountData } from "./accounts";
import { handleError } from "./handleError";
export interface BitcoinKeyPair {
  address: string;
  key: ECPairInterface;
}

export interface TransactionInfo {
  amount: string;
  commitFee: number;
  depositFee: number;
  encodedMessage?: string;
  format: EncodingFormat;
  gateway: string;
  network: string;
  operation: string;
  rawInscriptionData: string;
  receiver?: string;
  revealFee: number;
  revertOptions: RevertOptions;
  sender: string;
}

/**
 * Sets up a Bitcoin key pair using either a provided private key or one stored in the account data
 */
export const setupBitcoinKeyPair = (
  privateKey: string | undefined,
  name: string,
  network: bitcoin.Network
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
    network,
  });

  const { address } = bitcoin.payments.p2wpkh({
    network,
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
    amountInSats + info.commitFee + info.revealFee + info.depositFee;

  console.log(`
Network: ${info.network}
${info.amount ? `Amount: ${info.amount} BTC (${amountInSats} sats)` : ""}
Commit Fee: ${info.commitFee} sats (${formatBTC(info.commitFee)} BTC)
Reveal Fee: ${info.revealFee} sats (${formatBTC(info.revealFee)} BTC)
Deposit Fee: ${info.depositFee} sats (${formatBTC(info.depositFee)} BTC)
Total: ${totalSats} sats (${formatBTC(totalSats)} BTC)
Gateway: ${info.gateway}
Sender: ${info.sender}
Receiver: ${info.receiver || notApplicable}
Revert Address: ${info.revertOptions.revertAddress || notApplicable}
Abort Address: ${info.revertOptions.abortAddress || notApplicable}
Operation: ${info.operation}
${info.encodedMessage ? `Encoded Message: ${info.encodedMessage}` : ""}
Encoding Format: ${info.format}
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
  memo: string,
  network: "signet" | "mainnet"
) => {
  const totalAmount = amount + depositFee;

  console.log(`
Network: ${network === "signet" ? "Signet" : "Mainnet"}
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

export const createBitcoinCommandWithCommonOptions = (
  name: string
): Command => {
  return new Command(name)
    .option("--yes", "Skip confirmation prompt", false)
    .option("-r, --receiver <address>", "ZetaChain receiver address")
    .option("--commit-fee <fee>", "Commit fee (in sats)", "15000")
    .requiredOption(
      "-g, --gateway <address>",
      "Bitcoin gateway (TSS) address",
      DEFAULT_GATEWAY
    )
    .addOption(
      new Option("--private-key <key>", "Bitcoin private key").conflicts([
        "name",
      ])
    )
    .addOption(
      new Option("--name <name>", "Account name")
        .default(DEFAULT_ACCOUNT_NAME)
        .conflicts(["private-key"])
    );
};

export const createBitcoinMemoCommandWithCommonOptions = (
  name: string
): Command => {
  return createBitcoinCommandWithCommonOptions(name)
    .option("-d, --data <data>", "Pass raw data")
    .option("--network-fee <fee>", "Network fee (in sats)", "1750")
    .addOption(
      new Option("--network <network>", "Network")
        .choices(["signet", "mainnet"])
        .default("signet")
    )
    .option("--bitcoin-api <url>", "Bitcoin API", DEFAULT_BITCOIN_API)
    .option("--gas-price-api <url>", "ZetaChain API", DEFAULT_GAS_PRICE_API);
};

export const createBitcoinInscriptionCommandWithCommonOptions = (
  name: string
): Command => {
  return createBitcoinCommandWithCommonOptions(name)
    .option("--revert-address <address>", "Revert address")
    .option("--abort-address <address>", "Abort address")
    .addOption(
      new Option("--network <network>", "Network")
        .choices(["signet", "mainnet"])
        .default("signet")
    )
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
