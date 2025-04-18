import confirm from "@inquirer/confirm";
import { Keypair } from "@solana/web3.js";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import { z } from "zod";

import {
  AccountData,
  accountNameSchema,
  AvailableAccountTypes,
} from "../../../../types/accounts.types";
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
  type: z
    .enum(AvailableAccountTypes, {
      errorMap: () => ({ message: "Type must be either 'evm' or 'solana'" }),
    })
    .optional(),
});

type CreateAccountOptions = z.infer<typeof createAccountOptionsSchema>;

const createEVMAccount = (): AccountData => {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    mnemonic: wallet.mnemonic?.phrase,
    privateKey: wallet.privateKey,
  };
};

const createSolanaAccount = (): AccountData => {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: Buffer.from(keypair.secretKey).toString("hex"),
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

    const keyData = type === "evm" ? createEVMAccount() : createSolanaAccount();

    safeWriteFile(keyPath, keyData);
    console.log(`${type.toUpperCase()} account created successfully!`);
    console.log(`Key saved to: ${keyPath}`);
    if (type === "evm") {
      console.log(`Address: ${keyData.address}`);
    } else {
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
    await createAccountForType("evm", name);
    await createAccountForType("solana", name);
  }
};

export const createAccountsCommand = new Command("create")
  .description("Create a new account")
  .addOption(
    new Option("--type <type>", "Account type (evm or solana)").choices(
      AvailableAccountTypes
    )
  )
  .option("--name <name>", "Account name", "default")
  .action(async (opts) => {
    const validated = validateAndParseSchema(opts, createAccountOptionsSchema, {
      exitOnError: true,
    });
    await main(validated);
  });
