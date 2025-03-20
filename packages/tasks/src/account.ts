import { input } from "@inquirer/prompts";
import { Keypair } from "@solana/web3.js";
import { bech32 } from "bech32";
import { validateMnemonic } from "bip39";
import bs58 from "bs58";
import * as envfile from "envfile";
import * as fs from "fs";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as os from "os";
import * as path from "path";

import { numberArraySchema } from "../../../types/shared.schema";
import { parseJson } from "../../../utils";
import { bitcoinAddress } from "./bitcoinAddress";

export const hexToBech32Address = (
  hexAddress: string,
  prefix: string
): string => {
  const data = Buffer.from(hexAddress.substr(2), "hex");
  const words = bech32.toWords(data);
  return bech32.encode(prefix, words);
};

export const getWalletFromRecoveryInput = async (
  ethers: HardhatRuntimeEnvironment["ethers"]
) => {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const recovery = await input(
      {
        message: "EVM Mnemonic or private key:",
      },
      {
        clearPromptOnDone: true,
      }
    );
    try {
      if (validateMnemonic(recovery)) {
        return ethers.Wallet.fromPhrase(recovery);
      } else {
        return new ethers.Wallet(
          recovery.startsWith("0x") ? recovery : "0x" + recovery
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.error(`❌ Invalid mnemonic or private key: ${errorMessage}`);
      continue;
    }
  }
};

export const getSolanaWalletFromLocalFileOrInput =
  async (): Promise<Keypair | null> => {
    const solanaConfigPath = path.join(
      os.homedir(),
      ".config",
      "solana",
      "id.json"
    );

    if (fs.existsSync(solanaConfigPath)) {
      try {
        const fileContent = await fs.promises.readFile(
          solanaConfigPath,
          "utf-8"
        );
        const secretKey = parseJson(fileContent, numberArraySchema);
        return Keypair.fromSecretKey(Uint8Array.from(secretKey));
      } catch (error) {
        console.error("Failed to load Solana private key:", error);
        throw new Error(
          `Failed to load Solana wallet from ${solanaConfigPath}`
        );
      }
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const solanaPrivateKey = await input({
        message: "Solana private key (press Enter to skip):",
      });
      if (solanaPrivateKey.trim() === "") {
        console.log("Skipped Solana private key input.");
        return null;
      }
      try {
        return Keypair.fromSecretKey(bs58.decode(solanaPrivateKey));
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        console.error(`❌ Invalid Solana private key: ${errorMessage}`);
      }
    }
  };

export const savePrivateKey = (
  privateKey: string,
  solanaPrivateKey?: string
) => {
  const filePath = path.join(process.cwd(), ".env");
  const env = envfile.parse(
    fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : ""
  );
  env.PRIVATE_KEY = privateKey.slice(2);
  env.EVM_PRIVATE_KEY = privateKey.slice(2);
  env.BTC_PRIVATE_KEY = privateKey.slice(2);
  if (solanaPrivateKey) {
    env.SOLANA_PRIVATE_KEY = solanaPrivateKey;
  }

  fs.writeFileSync(filePath, envfile.stringify(env));
  console.log(`✅ Saved the private key to '${filePath}' file.\n`);
};

interface AccountTaskArgs {
  recover?: boolean;
  save?: boolean;
}

export const main = async (
  args: AccountTaskArgs,
  hre: HardhatRuntimeEnvironment
) => {
  const ethers = hre.ethers;
  let evmWallet;
  let solanaWallet;

  if (args.recover) {
    evmWallet = await getWalletFromRecoveryInput(ethers);
    solanaWallet = await getSolanaWalletFromLocalFileOrInput();
  } else {
    evmWallet = ethers.Wallet.createRandom();
    solanaWallet = Keypair.generate();
  }

  const { privateKey, address } = evmWallet;
  const pk = privateKey.slice(2);

  console.log(`
    🔑 EVM Private key: ${pk}`);

  if (solanaWallet) {
    console.log(`
      🔑 Solana Private key: ${bs58.encode(solanaWallet.secretKey)}`);
  }

  if ("mnemonic" in evmWallet && evmWallet.mnemonic?.phrase) {
    console.log(`
      🔐 EVM Mnemonic phrase: ${evmWallet.mnemonic.phrase}`);
  }

  console.log(`
  😃 EVM address: ${address}
    😃 Bitcoin address: ${bitcoinAddress(pk, "testnet")}
    😃 Bech32 address: ${hexToBech32Address(address, "zeta")}`);

  if (solanaWallet) {
    console.log(`
      😃 Solana address: ${solanaWallet.publicKey.toString()}`);
  }

  if (args.save) {
    savePrivateKey(
      privateKey,
      solanaWallet ? bs58.encode(solanaWallet.secretKey) : undefined
    );
  }
};

export const accountTask = task(
  "account",
  "Generates a new account and prints its private key, mnemonic phrase, and address to the console.",
  main
)
  .addFlag(
    "save",
    "Saves the private key to a '.env' file in the project directory."
  )
  .addFlag(
    "recover",
    "Recovers a wallet using either a mnemonic or a private key."
  );
