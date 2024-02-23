import { ZetaChainClient } from "./packages/client/src";
import { ethers } from "ethers";

const main = async () => {
  const client = new ZetaChainClient({
    network: "testnet",
    wallet: ethers.Wallet.fromMnemonic(
      "shove supply bounce favorite vibrant pizza table share crumble drift awake pig blood grief shift garage gate bulk destroy clay always destroy long opera"
    ),
  });

  const tx = await client.deposit({
    chain: "goerli_testnet",
    amount: "1",
    asset: "0x07865c6e87b9f70255377e024ace6630c1eaa37f",
    message: [
      ["string", "bool"],
      ["hello", "true"],
    ],
  });

  console.log(tx.hash);
};

main();
