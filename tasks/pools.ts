import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { getPools } from "../helpers/pools";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const pools = await getPools();
  const poolsFiltered = pools
    .map((n: any) => ({
      ZETA: parseFloat(n.reservesZETA).toFixed(2),
      "ZRC-20": parseFloat(n.reservesZRC20).toFixed(2),
      name: n.asset ? n.name : n.symbol,
    }))
    .sort((a: any, b: any) => {
      if (a.name > b.name) return -1;
    });
  console.table(poolsFiltered);
};

export const poolsTask = task("pools", "", main);
