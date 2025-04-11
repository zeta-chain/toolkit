import confirm from "@inquirer/confirm";
import { Keypair } from "@solana/web3.js";
import { Command } from "commander";
import { ethers } from "ethers";
import fs from "fs";
import os from "os";
import path from "path";

interface AccountData {
  [key: string]: string | undefined;
}

async function createEVMAccount(): Promise<AccountData> {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    mnemonic: wallet.mnemonic?.phrase,
    privateKey: wallet.privateKey,
  };
}

async function createSolanaAccount(): Promise<AccountData> {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: Buffer.from(keypair.secretKey).toString("hex"),
  };
}

async function main(options: { name: string; type: string }) {
  const { type, name } = options;

  if (type !== "evm" && type !== "solana") {
    console.error("Invalid account type. Must be either 'evm' or 'solana'");
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
      console.log("Operation cancelled.");
      return;
    }
  }

  const keyData =
    type === "evm" ? await createEVMAccount() : await createSolanaAccount();

  fs.writeFileSync(keyPath, JSON.stringify(keyData, null, 2));
  console.log(`Account created successfully!`);
  console.log(`Key saved to: ${keyPath}`);
  if (type === "evm") {
    console.log(`Address: ${keyData.address}`);
  } else {
    console.log(`Public Key: ${keyData.publicKey}`);
  }
}

export const createAccountsCommand = new Command("create")
  .description("Create a new account")
  .requiredOption("--type <type>", "Account type (evm or solana)")
  .requiredOption("--name <name>", "Account name")
  .action(main);
