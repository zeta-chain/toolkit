import { Command } from "commander";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import os from "os";

async function main(options: { type: string; name: string }) {
  const { type, name } = options;

  // Create wallet
  const wallet = ethers.Wallet.createRandom();

  // Prepare directory structure
  const baseDir = path.join(os.homedir(), ".zetachain", "keys", type);
  fs.mkdirSync(baseDir, { recursive: true });

  // Save private key
  const keyPath = path.join(baseDir, `${name}.json`);
  const keyData = {
    // Standard EVM key format
    address: wallet.address,
    privateKey: wallet.privateKey,
    // For compatibility with MetaMask and other tools
    mnemonic: wallet.mnemonic?.phrase,
    // For compatibility with Geth/Go Ethereum
    crypto: {
      cipher: "aes-128-ctr",
      ciphertext: wallet.privateKey,
      cipherparams: {
        iv: ethers.hexlify(ethers.randomBytes(16)),
      },
      kdf: "scrypt",
      kdfparams: {
        dklen: 32,
        n: 262144,
        r: 8,
        p: 1,
        salt: ethers.hexlify(ethers.randomBytes(32)),
      },
      mac: ethers
        .keccak256(
          ethers.concat([
            ethers.randomBytes(32),
            ethers.getBytes(wallet.privateKey),
          ])
        )
        .slice(2),
    },
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
