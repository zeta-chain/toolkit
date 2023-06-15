import { input } from "@inquirer/prompts";
import { bech32 } from "bech32";
import { validateMnemonic } from "bip39";
import * as envfile from "envfile";
import * as fs from "fs";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as path from "path";

export const hexToBech32Address = (
  hexAddress: string,
  prefix: string
): string => {
  const data = Buffer.from(hexAddress.substr(2), "hex");
  const words = bech32.toWords(data);
  return bech32.encode(prefix, words);
};

export const getWalletFromRecoveryInput = async (ethers: any) => {
  while (true) {
    let recovery = await input(
      {
        message: "Mnemonic or private key:",
      },
      {
        clearPromptOnDone: true,
      }
    );
    try {
      if (validateMnemonic(recovery)) {
        return ethers.Wallet.fromMnemonic(recovery);
      } else {
        return new ethers.Wallet(
          recovery.startsWith("0x") ? recovery : "0x" + recovery
        );
      }
    } catch (e) {
      console.error(`❌ Invalid mnemonic or private key: ${e}`);
      continue;
    }
  }
};

export const savePrivateKey = (privateKey: string) => {
  const filePath = path.join(process.cwd(), ".env");
  let env = envfile.parse(
    fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : ""
  );
  env.PRIVATE_KEY = privateKey.slice(2);
  fs.writeFileSync(filePath, envfile.stringify(env));
  console.log(`✅ Saved the private key to '${filePath}' file.\n`);
};

export const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const { ethers } = hre as any;
  let wallet;

  if (args.recover) {
    wallet = await getWalletFromRecoveryInput(ethers);
  } else {
    wallet = ethers.Wallet.createRandom();
  }

  const { privateKey, address, mnemonic } = wallet;

  console.log(`
🔑 Private key: ${privateKey}`);
  mnemonic && console.log(`🔐 Mnemonic phrase: ${mnemonic.phrase}`);
  console.log(`😃 Address: ${address}
😃 Bech32 address: ${hexToBech32Address(address, "zeta")}
`);

  if (args.save) {
    savePrivateKey(privateKey);
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
