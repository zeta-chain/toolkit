import { Command } from "commander";
import fs from "fs";
import os from "os";
import path from "path";

import {
  AccountDetails,
  EVMAccountData,
  SolanaAccountData,
} from "../../../../types/accounts.types";

const getEVMAccountDetails = (
  keyData: EVMAccountData,
  keyPath: string
): AccountDetails => {
  return {
    Address: keyData.address,
    "File Location": keyPath,
    Mnemonic: keyData.mnemonic || "N/A",
    Name: keyData.name || "N/A",
    "Private Key": keyData.privateKey,
    Type: "EVM",
  };
};

const getSolanaAccountDetails = (
  keyData: SolanaAccountData,
  keyPath: string
): AccountDetails => {
  return {
    "File Location": keyPath,
    Name: keyData.name || "N/A",
    "Public Key": keyData.publicKey,
    "Secret Key": keyData.secretKey,
    Type: "Solana",
  };
};

const main = (options: { name: string; type: string }): void => {
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

  const keyData = JSON.parse(fs.readFileSync(keyPath, "utf-8")) as
    | EVMAccountData
    | SolanaAccountData;
  keyData.name = name; // Add name to keyData for display

  const accountDetails =
    type === "evm"
      ? getEVMAccountDetails(keyData as EVMAccountData, keyPath)
      : getSolanaAccountDetails(keyData as SolanaAccountData, keyPath);

  console.log("\nAccount Details:");
  console.table(accountDetails);
};

export const showAccountsCommand = new Command("show")
  .description("Show details of an existing account")
  .requiredOption("--type <type>", "Account type (evm or solana)")
  .requiredOption("--name <name>", "Account name")
  .action(main);
