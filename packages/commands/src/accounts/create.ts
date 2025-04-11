import confirm from "@inquirer/confirm";
import { Keypair } from "@solana/web3.js";
import { Command } from "commander";
import { ethers } from "ethers";
import fs from "fs";
import os from "os";
import path from "path";

import { AccountData } from "../../../../types/accounts.types";

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

  const keyData = type === "evm" ? createEVMAccount() : createSolanaAccount();

  fs.writeFileSync(keyPath, JSON.stringify(keyData, null, 2));
  console.log(`${type.toUpperCase()} account created successfully!`);
  console.log(`Key saved to: ${keyPath}`);
  if (type === "evm") {
    console.log(`Address: ${keyData.address}`);
  } else {
    console.log(`Public Key: ${keyData.publicKey}`);
  }
};

const main = async (options: { name: string; type?: string }) => {
  const { type, name } = options;

  if (type && type !== "evm" && type !== "solana") {
    console.error("Invalid account type. Must be either 'evm' or 'solana'");
    return;
  }

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
  .option("--type <type>", "Account type (evm or solana)")
  .requiredOption("--name <name>", "Account name")
  .action(main);
