import { getEndpoints } from "@zetachain/networks";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import type { FeeDetails } from "../helpers/fees";
import { fetchCCMFees, fetchZEVMFees } from "../helpers/fees";
import { getAddress } from "@zetachain/protocol-contracts";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const { ethers } = hre as any;
  const { url } = hre.config.networks["zeta_testnet"] as any;
  const provider = new ethers.providers.JsonRpcProvider(url);
  const feesZEVM: Record<string, FeeDetails> = {};
  const feesCCM: Record<string, FeeDetails> = {};

  const networks = [...Object.keys(hre.config.networks), "btc_testnet"];

  await Promise.all(
    networks.map(async (n) => {
      try {
        const zevmFees = await fetchZEVMFees(n, provider, hre);
        if (zevmFees) feesZEVM[n] = zevmFees;
      } catch (err) {}

      try {
        const ccmFees = await fetchCCMFees(n, hre);
        if (ccmFees) feesCCM[n] = ccmFees;
      } catch (err) {}
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
