import { Command } from "commander";
import fs from "fs";
import path from "path";
import os from "os";

async function main(options: { type: string; name: string }) {
  const { type, name } = options;
  const baseDir = path.join(os.homedir(), ".zetachain", "keys", type);
  const keyPath = path.join(baseDir, `${name}.json`);

  if (!fs.existsSync(keyPath)) {
    console.error(`Account ${name} of type ${type} not found at ${keyPath}`);
    process.exit(1);
  }

  const keyData = JSON.parse(fs.readFileSync(keyPath, "utf-8"));

  const accountDetails = {
    Type: type,
    Name: name,
    Address: keyData.address,
    "Private Key": keyData.privateKey,
    Mnemonic: keyData.mnemonic || "N/A",
    "File Location": keyPath,
  };

  console.log("\nAccount Details:");
  console.table(accountDetails);
}

export const showAccountsCommand = new Command("show")
  .description("Show details of an existing account")
  .requiredOption("--type <type>", "Account type (e.g. evm)")
  .requiredOption("--name <name>", "Account name")
  .action(main);
