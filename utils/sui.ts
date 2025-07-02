import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { bech32 } from "bech32";
import { mnemonicToSeedSync } from "bip39";
import { HDKey } from "ethereum-cryptography/hdkey";
import { z } from "zod";

import { SuiAccountData } from "../types/accounts.types";
import { suiGatewayAddressSchema } from "../types/shared.schema";
import { getAccountData } from "./accounts";
import { getAddress } from "./getAddress";
import { validateAndParseSchema } from "./validateAndParseSchema";

export const GAS_BUDGET = 10_000_000;
export const SUI_GAS_COIN_TYPE = "0x2::sui::SUI";
export const SUI_DEFAULT_DECIMALS = "9";

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
  name?: string;
  privateKey?: string;
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
    throw new Error("Either mnemonic, private key or name must be provided");
  }
};

export interface SignAndExecuteTransactionOptions {
  client: SuiClient;
  gasBudget: bigint;
  keypair: Ed25519Keypair;
  tx: Transaction;
}

export const signAndExecuteTransaction = async ({
  client,
  keypair,
  tx,
  gasBudget,
}: SignAndExecuteTransactionOptions) => {
  tx.setGasBudget(gasBudget);

  const result = await client.signAndExecuteTransaction({
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
    requestType: "WaitForLocalExecution",
    signer: keypair,
    transaction: tx,
  });

  if (result.effects?.status.status === "failure") {
    console.error("Transaction failed:", result.effects.status.error);
    throw new Error(`Transaction failed: ${result.effects.status.error}`);
  }

  console.log("\nTransaction successful!");
  console.log(`Transaction hash: ${result.digest}`);

  return result;
};

export const chainIds = ["101", "103", "104"] as const;
export const networks = ["mainnet", "testnet", "localnet"] as const;

export type SuiNetwork = (typeof networks)[number];

export const getNetwork = (
  network?: SuiNetwork,
  chainId?: (typeof chainIds)[number]
): SuiNetwork => {
  if (network) {
    return network;
  }
  if (chainId) {
    const index = chainIds.indexOf(chainId);
    if (index === -1) {
      throw new Error(`Invalid chain ID: ${chainId}`);
    }
    return networks[index];
  }
  throw new Error("Either network or chainId must be provided");
};

// Convert decimal amount to smallest unit (e.g., SUI to MIST)
export const toSmallestUnit = (amount: string, decimals = 9): bigint => {
  if (!/^\d+(\.\d+)?$/.test(amount)) {
    throw new Error("Invalid decimal amount");
  }
  const [whole = "0", fraction = ""] = amount.split(".");

  // Check for precision loss
  if (fraction.length > decimals) {
    const truncatedPart = fraction.slice(decimals);
    if (/[1-9]/.test(truncatedPart)) {
      throw new Error(
        `Precision loss detected: Input has ${fraction.length} decimal places but only ${decimals} are supported. ` +
          `Non-zero digits would be lost: "${truncatedPart}"`
      );
    }
  }

  const paddedFraction = (fraction + "0".repeat(decimals)).slice(0, decimals);
  const multiplier = BigInt(10) ** BigInt(decimals);
  return BigInt(whole) * multiplier + BigInt(paddedFraction);
};

export const commonDepositObjectSchema = z.object({
  amount: z.string(),
  chainId: z.enum(chainIds),
  coinType: z.string().default(SUI_GAS_COIN_TYPE),
  decimals: z.string(),
  gasBudget: z.string(),
  gatewayObject: z.string().optional(),
  gatewayPackage: z.string().optional(),
  mnemonic: z.string().optional(),
  name: z.string().optional(),
  privateKey: z.string().optional(),
  receiver: z.string(),
});

export const commonDepositOptionsSchema = commonDepositObjectSchema.refine(
  (data) => data.mnemonic || data.privateKey || data.name,
  {
    message: "Either mnemonic, private key or name must be provided",
  }
);

/**
 * Parses and validates a Sui gateway address string
 * @param gatewayAddress - The gateway address string in format "package,object"
 * @returns Parsed gateway address with package and object properties
 * @throws Error if the gateway address format is invalid
 */
export const parseSuiGatewayAddress = (gatewayAddress: string) => {
  return validateAndParseSchema(gatewayAddress, suiGatewayAddressSchema, {
    shouldLogError: false,
  });
};

/**
 * Gets the gateway address from chain ID and parses it, or uses provided package and object
 * @param chainId - The chain ID to get the gateway address for
 * @param gatewayPackage - Optional gateway package to use instead of getting from chain ID
 * @param gatewayObject - Optional gateway object to use instead of getting from chain ID
 * @returns Parsed gateway address with package and object properties
 * @throws Error if the gateway address is not found or format is invalid
 */
export const getSuiGatewayAndClient = (
  chainId: (typeof chainIds)[number],
  gatewayPackage?: string,
  gatewayObject?: string
) => {
  let result;

  const network = networks[chainIds.indexOf(chainId)];
  const client = new SuiClient({ url: getFullnodeUrl(network) });

  // If both package and object are provided, use them directly
  if (gatewayPackage && gatewayObject) {
    result = { client, gatewayObject, gatewayPackage };
  } else {
    // Otherwise, get the gateway address from chain ID and parse it
    const gatewayAddress = getAddress("gateway", Number(chainId));
    if (!gatewayAddress) {
      throw new Error("Gateway address not found");
    }

    result = {
      ...parseSuiGatewayAddress(gatewayAddress),
      client,
    };
  }

  return result;
};
