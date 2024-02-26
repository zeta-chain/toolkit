import { ZetaChainClient } from "./packages/client/src";
import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

console.log(process.env.MNEMONIC);

const main = async () => {
  const client = new ZetaChainClient({
    network: "testnet",
    wallet: ethers.Wallet.fromMnemonic(process.env.MNEMONIC as string),
  });

  const tx = await client.deposit({
    chain: "goerli_testnet",
    amount: "1",
    erc20: "0x07865c6e87b9f70255377e024ace6630c1eaa37f",
    message: [
      ["string", "bool"],
      ["hello", "true"],
    ],
  });

  console.log(tx.hash);
};

main();
