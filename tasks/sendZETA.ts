import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { sendZETA } from "../helpers/sendZETA";

declare const hre: any;

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const [signer] = await hre.ethers.getSigners();

  const { amount, destination, recipient } = args;
  const from = hre.network.name;

  const tx = await sendZETA(signer, amount, from, destination, recipient);
  if (args.json) {
    console.log(JSON.stringify(tx, null, 2));
  } else {
    console.log(`Transaction hash: ${tx.hash}`);
  }
};

export const sendZETATask = task(
  "send-zeta",
  "Send ZETA tokens between connected chains",
  main
)
  .addParam("amount", "Amount of ZETA to send")
  .addParam("destination", "Destination chain")
  .addOptionalParam("recipient", "Recipient address")
  .addFlag("json", "Output JSON");
