import { Command } from "commander";
import fs from "fs";
import os from "os";
import path from "path";

import {
  AccountInfo,
  EVMAccountData,
  SolanaAccountData,
} from "../../../../types/accounts.types";

const main = (options: { json: boolean }): void => {
  const { json } = options;
  const baseDir = path.join(os.homedir(), ".zetachain", "keys");
  const accounts: AccountInfo[] = [];

  // List EVM accounts
  const evmDir = path.join(baseDir, "evm");
  if (fs.existsSync(evmDir)) {
    const evmFiles = fs
      .readdirSync(evmDir)
      .filter((file) => file.endsWith(".json"));
    for (const file of evmFiles) {
      const keyPath = path.join(evmDir, file);
      const keyData = JSON.parse(
        fs.readFileSync(keyPath, "utf-8")
      ) as EVMAccountData;
      accounts.push({
        address: keyData.address,
        name: file.replace(".json", ""),
        type: "evm",
      });
    }
  }

  // List Solana accounts
  const solanaDir = path.join(baseDir, "solana");
  if (fs.existsSync(solanaDir)) {
    const solanaFiles = fs
      .readdirSync(solanaDir)
      .filter((file) => file.endsWith(".json"));
    for (const file of solanaFiles) {
      const keyPath = path.join(solanaDir, file);
      const keyData = JSON.parse(
        fs.readFileSync(keyPath, "utf-8")
      ) as SolanaAccountData;
      accounts.push({
        address: keyData.publicKey,
        name: file.replace(".json", ""),
        type: "solana",
      });
    }
  }

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
