import { Command } from "commander";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import os from "os";
import confirm from "@inquirer/confirm";

async function main(options: { type: string; name: string }) {
  const { type, name } = options;
  const wallet = ethers.Wallet.createRandom();

  const baseDir = path.join(os.homedir(), ".zetachain", "keys", type);
  fs.mkdirSync(baseDir, { recursive: true });

  const keyPath = path.join(baseDir, `${name}.json`);
  if (fs.existsSync(keyPath)) {
    const shouldOverwrite = await confirm({
      message: `File ${keyPath} already exists. Overwrite?`,
      default: false,
    });
    if (!shouldOverwrite) {
      console.log("Operation cancelled.");
      return;
    }
  }

  const keyData = {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase,
  };

  fs.writeFileSync(keyPath, JSON.stringify(keyData, null, 2));
  console.log(`Account created successfully!`);
  console.log(`Private key saved to: ${keyPath}`);
  console.log(`Address: ${wallet.address}`);
}

export const createAccountsCommand = new Command("create")
  .description("Create a new account")
  .requiredOption("--type <type>", "Account type (e.g. evm)")
  .requiredOption("--name <name>", "Account name")
  .action(main);
