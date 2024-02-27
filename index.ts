import * as dotenv from "dotenv";
import { ethers } from "ethers";

import { ZetaChainClient } from "./packages/client/src";

dotenv.config();

const main = async () => {
  const client = new ZetaChainClient({
    network: "testnet",
    wallet: ethers.Wallet.fromMnemonic(process.env.MNEMONIC as string),
  });

  const tx = await client.getBalances({
    evm: "0x4955a3F38ff86ae92A914445099caa8eA2B9bA32",
  });

  console.log(tx);
};

main();
