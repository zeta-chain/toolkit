import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { trackCCTX } from "../helpers";

declare const hre: any;

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  await trackCCTX(args.tx, args.json);
};

export const cctxTask = task(
  "cctx",
  "Track cross-chain transaction status",
  main
)
  .addPositionalParam("tx", "TX hash of an inbound transaction or a CCTX")
  .addFlag("json", "Output as JSON");
