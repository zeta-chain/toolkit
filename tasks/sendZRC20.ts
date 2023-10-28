import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { sendZRC20 } from "../helpers/sendZRC20";

declare const hre: any;

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const { ethers } = hre as any;
  const [signer] = await ethers.getSigners();
  const tx = (await sendZRC20(
    signer,
    args.amount,
    hre.network.name,
    args.destination,
    args.recipient,
    args.token
  )) as any;
  console.log(`Transaction hash: ${tx.hash}`);
};

export const sendZRC20Task = task(
  "send-zrc20",
  "Send ZRC-20 tokens to and from ZetaChain",
  main
)
  .addParam("amount", "Amount of ZRC-20 to send")
  .addParam("destination", "Destination chain")
  .addParam("token", "Token to send (geth, usdc, etc)");
