import { Command } from "commander";
import fs from "fs";
import path from "path";
import os from "os";

interface AccountDetails {
  [key: string]: string;
}

function getEVMAccountDetails(keyData: any, keyPath: string): AccountDetails {
  return {
    Type: "EVM",
    Name: keyData.name,
    Address: keyData.address,
    "Private Key": keyData.privateKey,
    Mnemonic: keyData.mnemonic || "N/A",
    "File Location": keyPath,
  };
}

function getSolanaAccountDetails(
  keyData: any,
  keyPath: string
): AccountDetails {
  return {
    Type: "Solana",
    Name: keyData.name,
    "Public Key": keyData.publicKey,
    "Secret Key": keyData.secretKey,
    "File Location": keyPath,
  };
}

async function main(options: { type: string; name: string }) {
  const { type, name } = options;

  if (type !== "evm" && type !== "solana") {
    console.error("Invalid account type. Must be either 'evm' or 'solana'");
    process.exit(1);
  }

  const baseDir = path.join(os.homedir(), ".zetachain", "keys", type);
  const keyPath = path.join(baseDir, `${name}.json`);

  if (!fs.existsSync(keyPath)) {
    console.error(`Account ${name} of type ${type} not found at ${keyPath}`);
    process.exit(1);
  }

  const keyData = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
  keyData.name = name; // Add name to keyData for display

  const accountDetails =
    type === "evm"
      ? getEVMAccountDetails(keyData, keyPath)
      : getSolanaAccountDetails(keyData, keyPath);

  console.log("\nAccount Details:");
  console.table(accountDetails);
}

export const showAccountsCommand = new Command("show")
  .description("Show details of an existing account")
  .requiredOption("--type <type>", "Account type (evm or solana)")
  .requiredOption("--name <name>", "Account name")
  .action(main);
