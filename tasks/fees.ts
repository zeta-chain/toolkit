import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { fetchFees, fetchCCMFees } from "../helpers/fees";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const fees = await fetchFees();

  console.log("\nOmnichain fees (in native gas tokens of destination chain):");
  console.table(fees.feesZEVM);
  console.log("\nCross-chain messaging fees (in ZETA):");
  console.table(fees.feesCCM);
};

export const feesTask = task(
  "fees",
  "Show omnichain and cross-chain messaging fees",
  main
);
