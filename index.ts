import { ZetaChainClient } from "./packages/client/src";
import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const main = async () => {
  const client = new ZetaChainClient({
    network: "testnet",
    wallet: ethers.Wallet.fromMnemonic(process.env.MNEMONIC as string),
  });

  const tx = await client.withdraw({
    chain: "zeta_testnet",
    amount: "1",
    zrc20: "0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a",
  });

  console.log(tx.hash);
};

main();
