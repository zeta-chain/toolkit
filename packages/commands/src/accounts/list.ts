import { Command } from "commander";
import fs from "fs";
import os from "os";
import path from "path";
import { z } from "zod";

import {
  AccountInfo,
  EVMAccountData,
  SolanaAccountData,
} from "../../../../types/accounts.types";
import { validateTaskArgs } from "../../../../utils";

const listAccountsOptionsSchema = z.object({
  json: z.boolean().default(false),
});

const listChainAccounts = (
  baseDir: string,
  chainType: "evm" | "solana",
  accounts: AccountInfo[]
): void => {
  const chainDir = path.join(baseDir, chainType);
  if (!fs.existsSync(chainDir)) return;

  const files = fs
    .readdirSync(chainDir)
    .filter((file) => file.endsWith(".json"));

  for (const file of files) {
    const keyPath = path.join(chainDir, file);
    const keyData = JSON.parse(fs.readFileSync(keyPath, "utf-8")) as
      | EVMAccountData
      | SolanaAccountData;

    accounts.push({
      address:
        chainType === "evm"
          ? (keyData as EVMAccountData).address
          : (keyData as SolanaAccountData).publicKey,
      name: file.replace(".json", ""),
      type: chainType,
    });
  }
};

type ListAccountsOptions = z.infer<typeof listAccountsOptionsSchema>;

const main = (options: ListAccountsOptions): void => {
  const { json } = validateTaskArgs(options, listAccountsOptionsSchema);
  const baseDir = path.join(os.homedir(), ".zetachain", "keys");
  const accounts: AccountInfo[] = [];

  listChainAccounts(baseDir, "evm", accounts);
  listChainAccounts(baseDir, "solana", accounts);

  if (accounts.length === 0) {
    console.log("No accounts found.");
    return;
  }

  if (json) {
    console.log(JSON.stringify(accounts, null, 2));
  } else {
    console.log("\nAvailable Accounts:");
    console.table(accounts);
  }
};

export const listAccountsCommand = new Command("list")
  .description("List all available accounts")
  .option("--json", "Output in JSON format")
  .action(main);
