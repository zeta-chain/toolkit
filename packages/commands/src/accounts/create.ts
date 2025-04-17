import confirm from "@inquirer/confirm";
import { Keypair } from "@solana/web3.js";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import fs from "fs";
import os from "os";
import path from "path";
import { z } from "zod";

import {
  AccountData,
  AvailableAccountTypes,
} from "../../../../types/accounts.types";
import { handleError } from "../../../../utils/handleError";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";

const createAccountOptionsSchema = z.object({
  name: z.string().min(1, "Account name is required"),
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
  type: string,
  name: string
): Promise<void> => {
  // Validate name doesn't contain path traversal characters
  if (name.includes("/") || name.includes("\\") || name.includes("..")) {
    handleError({
      context: "Invalid account name",
      error: new Error(
        "Invalid account name. Name cannot contain path characters."
      ),
      shouldThrow: true,
    });
    return;
  }

  const baseDir = path.join(os.homedir(), ".zetachain", "keys", type);
  fs.mkdirSync(baseDir, { recursive: true });

  const keyPath = path.join(baseDir, `${name}.json`);
  if (fs.existsSync(keyPath)) {
    const shouldOverwrite = await confirm({
      default: false,
      message: `File ${keyPath} already exists. Overwrite?`,
    });
    if (!shouldOverwrite) {
      console.log(`Operation cancelled for ${type} account.`);
      return;
    }
  }

  try {
    const keyData = type === "evm" ? createEVMAccount() : createSolanaAccount();

    fs.writeFileSync(keyPath, JSON.stringify(keyData, null, 2));
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
  .requiredOption("--name <name>", "Account name")
  .action(async (opts) => {
    const validated = validateAndParseSchema(opts, createAccountOptionsSchema, {
      exitOnError: true,
    });
    await main(validated);
  });
