import { Command } from "commander";
import fs from "fs";
import os from "os";
import path from "path";

interface AccountInfo {
  Address: string;
  Name: string;
  Type: string;
}

async function main() {
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
      const keyData = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
      accounts.push({
        Address: keyData.address,
        Name: file.replace(".json", ""),
        Type: "EVM",
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
      const keyData = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
      accounts.push({
        Address: keyData.publicKey,
        Name: file.replace(".json", ""),
        Type: "Solana",
      });
    }
  }

  if (accounts.length === 0) {
    console.log("No accounts found.");
    return;
  }

  console.log("\nAvailable Accounts:");
  console.table(accounts);
}

export const listAccountsCommand = new Command("list")
  .description("List all available accounts")
  .action(main);
