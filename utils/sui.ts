import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { bech32 } from "bech32";
import { mnemonicToSeedSync } from "bip39";
import { HDKey } from "ethereum-cryptography/hdkey";
import { SuiAccountData } from "../types/accounts.types";
import { getAccountData } from "./accounts";

export const GAS_BUDGET = 10_000_000;

export const getCoin = async (
  client: SuiClient,
  owner: string,
  coinType: string,
  excludeObjectId?: string
): Promise<string> => {
  const coins = await client.getCoins({
    coinType,
    owner,
  });
  if (!coins.data.length) {
    throw new Error(`No coins of type ${coinType} found in this account`);
  }

  if (excludeObjectId) {
    const otherCoin = coins.data.find(
      (coin) => coin.coinObjectId !== excludeObjectId
    );
    if (!otherCoin) {
      throw new Error(`No other SUI coins found for gas payment`);
    }
    return otherCoin.coinObjectId;
  }

  return coins.data[0].coinObjectId;
};

export const getKeypairFromMnemonic = (mnemonic: string): Ed25519Keypair => {
  const seed = mnemonicToSeedSync(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed);
  const derivedKey = hdKey.derive("m/44'/784'/0'/0'/0'");

  if (!derivedKey.privateKey || derivedKey.privateKey.length !== 32) {
    throw new Error(
      "Failed to derive a valid Ed25519 private key from mnemonic"
    );
  }

  return Ed25519Keypair.fromSecretKey(derivedKey.privateKey);
};

export const getKeypairFromPrivateKey = (
  privateKey: string
): Ed25519Keypair => {
  try {
    // Check if the private key is in Bech32 format
    if (privateKey.startsWith("suiprivkey1")) {
      try {
        const decoded = bech32.decode(privateKey);
        if (!decoded) {
          throw new Error("Invalid Bech32 private key");
        }

        // Convert the decoded words to bytes
        const words = bech32.fromWords(decoded.words);
        // Skip the version byte (first byte) and take the next 32 bytes
        const keyBytes = Buffer.from(words.slice(1, 33));

        // Validate the key length
        if (keyBytes.length !== 32) {
          throw new Error(
            `Invalid key length: ${keyBytes.length} bytes (expected 32)`
          );
        }

        return Ed25519Keypair.fromSecretKey(keyBytes);
      } catch (error: unknown) {
        console.error("Bech32 decoding error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Invalid Bech32 private key format: ${errorMessage}`);
      }
    }

    // Handle hex format
    const cleanKey = privateKey.startsWith("0x")
      ? privateKey.slice(2)
      : privateKey;

    // Validate hex length
    if (cleanKey.length !== 64) {
      throw new Error(
        `Invalid hex key length: ${cleanKey.length} chars (expected 64)`
      );
    }

    const keyBytes = Uint8Array.from(Buffer.from(cleanKey, "hex"));
    return Ed25519Keypair.fromSecretKey(keyBytes);
  } catch (error: unknown) {
    console.error("Private key processing error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Invalid private key format: ${errorMessage}`);
  }
};

export interface KeypairOptions {
  mnemonic?: string;
  privateKey?: string;
  name?: string;
}

export const getKeypair = (options: KeypairOptions): Ed25519Keypair => {
  if (options.mnemonic) {
    return getKeypairFromMnemonic(options.mnemonic);
  } else if (options.privateKey) {
    return getKeypairFromPrivateKey(options.privateKey);
  } else if (options.name) {
    const account = getAccountData<SuiAccountData>("sui", options.name);
    if (!account?.privateKey) {
      throw new Error("No private key found for the specified account");
    }
    return getKeypairFromPrivateKey(account.privateKey);
  } else {
    throw new Error("Either mnemonic or private key must be provided");
  }
};

export interface SignAndExecuteTransactionOptions {
  client: SuiClient;
  keypair: Ed25519Keypair;
  transaction: Transaction;
  gasBudget: bigint;
}

export interface TransactionResult {
  digest: string;
  effects?: {
    status: {
      status: string;
      error?: string;
    };
  } | null;
  events?: Array<{
    type: string;
    parsedJson?: unknown;
  }>;
}

export const signAndExecuteTransaction = async ({
  client,
  keypair,
  transaction,
  gasBudget,
}: SignAndExecuteTransactionOptions): Promise<TransactionResult> => {
  transaction.setGasBudget(gasBudget);

  const result = await client.signAndExecuteTransaction({
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
    requestType: "WaitForLocalExecution",
    signer: keypair,
    transaction,
  });

  if (result.effects?.status.status === "failure") {
    console.error("Transaction failed:", result.effects.status.error);
    throw new Error(`Transaction failed: ${result.effects.status.error}`);
  }

  console.log("\nTransaction successful!");
  console.log(`Transaction hash: ${result.digest}`);

  return result as TransactionResult;
};

export const chainIdToNetwork = {
  "0103": "localnet",
  "101": "mainnet",
  "103": "testnet",
} as const;

export type SuiNetwork =
  (typeof chainIdToNetwork)[keyof typeof chainIdToNetwork];

export const getNetwork = (
  network?: SuiNetwork,
  chainId?: keyof typeof chainIdToNetwork
): SuiNetwork => {
  const resolvedNetwork =
    network || (chainId ? chainIdToNetwork[chainId] : undefined);
  if (!resolvedNetwork) {
    throw new Error("Either network or chainId must be provided");
  }
  return resolvedNetwork;
};
