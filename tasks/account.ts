import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as envfile from "envfile";
import * as fs from "fs";
import * as path from "path";
import { bech32 } from "bech32";
import { input } from "@inquirer/prompts";

function hexToBech32Address(hexAddress: string, prefix: string): string {
  const data = Buffer.from(hexAddress.substr(2), "hex");
  const words = bech32.toWords(data);
  return bech32.encode(prefix, words);
}

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const { ethers } = hre as any;
  let wallet;

  if (args.recover) {
    const recovery = await input({
      message: "Mnemonic or private key:",
    });

    if (recovery.split(" ").length >= 12) {
      wallet = ethers.Wallet.fromMnemonic(recovery);
    } else {
      wallet = new ethers.Wallet(
        recovery.startsWith("0x") ? recovery : "0x" + recovery
      );
    }
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
    const filePath = path.join(process.cwd(), ".env");
    let env = envfile.parse(
      fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : ""
    );
    env.PRIVATE_KEY = privateKey.slice(2);
    fs.writeFileSync(filePath, envfile.stringify(env));
    console.log(`✅ Saved the private key to '${filePath}' file.\n`);
  }
};

export const accountTask = task(
  "account",
  `Generates a new account and prints its private key, mnemonic phrase, and address to the console.`,
  main
)
  .addFlag(
    "save",
    `Saves the private key to a '.env' file in the project directory.`
  )
  .addFlag(
    "recover",
    `Recovers a wallet using either a mnemonic or a private key.`
  );
