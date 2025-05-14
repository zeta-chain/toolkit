import confirm from "@inquirer/confirm";
import axios from "axios";
import * as bitcoin from "bitcoinjs-lib";
import { Command, Option } from "commander";
import ECPairFactory, { ECPairInterface } from "ecpair";
import { ethers } from "ethers";
import * as ecc from "tiny-secp256k1";

import { BitcoinAccountData } from "../types/accounts.types";
import { BITCOIN_FEES } from "../types/bitcoin.constants";
import type { BtcUtxo } from "../types/bitcoin.types";
import { DEFAULT_ACCOUNT_NAME } from "../types/shared.constants";
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
  amount?: string;
  commitFee: number;
  encodedMessage?: string;
  encodingFormat: string;
  gateway: string;
  network: string;
  operation: string;
  rawInscriptionData: string;
  receiver?: string;
  revealFee: number;
  revertAddress?: string;
  sender: string;
  totalFee: number;
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

/**
 * Displays transaction details to the user and asks for confirmation before proceeding
 */
export const displayAndConfirmTransaction = async (info: TransactionInfo) => {
  const notApplicable = "encoded in raw inscription data";

  console.log(`
Network: ${info.network}
${info.amount ? `Amount: ${info.amount} BTC` : ""}
Gateway: ${info.gateway}
Sender: ${info.sender}
Universal Contract: ${info.receiver || notApplicable}
Revert Address: ${info.revertAddress || notApplicable}
Operation: ${info.operation}
${info.encodedMessage ? `Encoded Message: ${info.encodedMessage}` : ""}
Encoding Format: ${info.encodingFormat}
Raw Inscription Data: ${info.rawInscriptionData}
Fees:
  - Commit Fee: ${info.commitFee} sat
  - Reveal Fee: ${info.revealFee} sat
  - Total Fee: ${info.totalFee} sat (${(info.totalFee / 100000000).toFixed(
    8
  )} BTC)
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

/**
 * Adds common Bitcoin-related command options to a Commander command
 */
export const addCommonOptions = (command: Command) => {
  return command
    .option("--api <url>", "Bitcoin API", "https://mempool.space/signet/api")
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
