import confirm from "@inquirer/confirm";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Keypair } from "@solana/web3.js";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import { z } from "zod";

import {
  AccountData,
  accountNameSchema,
  accountTypeSchema,
  AvailableAccountTypes,
} from "../../../../types/accounts.types";
import { DEFAULT_ACCOUNT_NAME } from "../../../../types/shared.constants";
import { createBitcoinAccount } from "../../../../utils/accounts";
import {
  safeExists,
  safeMkdir,
  safeWriteFile,
} from "../../../../utils/fsUtils";
import { handleError } from "../../../../utils/handleError";
import {
  getAccountKeyPath,
  getAccountTypeDir,
} from "../../../../utils/keyPaths";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";
const createAccountOptionsSchema = z.object({
  name: accountNameSchema,
  type: accountTypeSchema.optional(),
});

type CreateAccountOptions = z.infer<typeof createAccountOptionsSchema>;

const createEVMAccount = (): AccountData => {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address.toLowerCase(),
    mnemonic: wallet.mnemonic?.phrase,
    privateKey: wallet.privateKey,
    privateKeyEncoding: "hex",
    privateKeyScheme: "secp256k1",
  };
};

const createSolanaAccount = (): AccountData => {
  const keypair = Keypair.generate();
  return {
    address: keypair.publicKey.toBase58(),
    privateKey: `0x${Buffer.from(keypair.secretKey).toString("hex")}`,
    privateKeyEncoding: "hex",
    privateKeyScheme: "ed25519",
  };
};

const createSUIAccount = (): AccountData => {
  const keypair = new Ed25519Keypair();
  const secretKey = keypair.getSecretKey();
  return {
    address: keypair.toSuiAddress(),
    privateKey: `0x${Buffer.from(secretKey).toString("hex")}`,
    privateKeyEncoding: "hex",
    privateKeyScheme: "ed25519",
    publicKey: keypair.getPublicKey().toBase64(),
  };
};

const createAccountForType = async (
  type: (typeof AvailableAccountTypes)[number],
  name: string
): Promise<void> => {
  try {
    const baseDir = getAccountTypeDir(type);
    safeMkdir(baseDir);

    const keyPath = getAccountKeyPath(type, name);

    if (safeExists(keyPath)) {
      const shouldOverwrite = await confirm({
        default: false,
        message: `File ${keyPath} already exists. Overwrite?`,
      });
      if (!shouldOverwrite) {
        console.log(`Operation cancelled for ${type} account.`);
        return;
      }
    }

    let keyData: AccountData;

    if (type === "evm") {
      keyData = createEVMAccount();
    } else if (type === "solana") {
      keyData = createSolanaAccount();
    } else if (type === "sui") {
      keyData = createSUIAccount();
    } else if (type === "bitcoin") {
      // Default to testnet for Bitcoin
      keyData = createBitcoinAccount();
    } else {
      // Type assertion to help TypeScript understand this isn't 'never'
      throw new Error(`Unsupported account type: ${type as string}`);
    }
    safeWriteFile(keyPath, keyData);
    console.log(`${type.toUpperCase()} account created successfully!`);
    console.log(`Key saved to: ${keyPath}`);
    if (type === "evm") {
      console.log(`Address: ${keyData.address}`);
    } else if (type === "solana") {
      console.log(`Public Key: ${keyData.address}`);
    } else {
      console.log(`Address: ${keyData.address}`);
      console.log(`Public Key: ${keyData.publicKey}`);
    }
  } catch (error: unknown) {
    handleError({
      context: "Failed to create or save account",
      error,
      shouldThrow: true,
    });
  }
};

const main = async (options: CreateAccountOptions) => {
  const { type, name } = options;

  if (type) {
    await createAccountForType(type, name);
  } else {
    console.log("Creating accounts for all supported types...");
    for (const accountType of AvailableAccountTypes) {
      await createAccountForType(accountType, name);
    }
  }
};

export const createAccountsCommand = new Command("create")
  .description("Create a new account")
  .addOption(
    new Option("--type <type>", "Account type").choices(AvailableAccountTypes)
  )
  .option("--name <name>", "Account name", DEFAULT_ACCOUNT_NAME)
  .action(async (opts) => {
    const validated = validateAndParseSchema(opts, createAccountOptionsSchema, {
      exitOnError: true,
    });
    await main(validated);
  });
