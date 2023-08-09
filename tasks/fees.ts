import { getEndpoints } from "@zetachain/networks";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import type { FeeDetails } from "../helpers/fees";
import { fetchCCMFees, fetchZEVMFees } from "../helpers/fees";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const { ethers } = hre as any;
  const { url } = hre.config.networks["zeta_testnet"] as any;
  const provider = new ethers.providers.JsonRpcProvider(url);
  const feesZEVM: Record<string, FeeDetails> = {};
  const feesCCM: Record<string, FeeDetails> = {};

  const networks = Object.keys(hre.config.networks);

  await Promise.all(
    networks.map(async (network) => {
      return Promise.all([
        fetchZEVMFees(network, provider, hre),
        fetchCCMFees(network, hre),
      ])
        .then(([zevmFees, ccmFees]) => {
          if (zevmFees) feesZEVM[network] = zevmFees;
          if (ccmFees) feesCCM[network] = ccmFees;
        })
        .catch(() => {});
    })
  );

  console.log("\nOmnichain fees (in native gas tokens of destination chain):");
  console.table(feesZEVM);
  console.log("\nCross-chain messaging fees (in ZETA):");
  console.table(feesCCM);
};

export const feesTask = task(
  "fees",
  "Show omnichain and cross-chain messaging fees",
  main
);
