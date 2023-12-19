import { getAddress } from "@zetachain/protocol-contracts";
import { formatUnits } from "ethers/lib/utils";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { getForeignCoins } from "../helpers/balances";
import { getPools } from "../helpers/pools";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const foreignCoins = await getForeignCoins();
  const pools = await getPools();

  const addressToInfo = foreignCoins.reduce((acc: any, coin: any) => {
    acc[coin.zrc20_contract_address.toLowerCase()] = {
      decimals: coin.decimals,
      symbol: coin.symbol,
    };
    return acc;
  }, {});

  const wzeta = getAddress("zetaToken", "zeta_testnet");
  const WZETA_ADDRESS = wzeta.toLowerCase();
  addressToInfo[WZETA_ADDRESS] = { decimals: 18, symbol: "WZETA" };

  const poolsWithSymbolsAndDecimals = pools.map((pool) => {
    pool.t0.reserve = formatUnits(pool.t0.reserve, pool.t0.decimals);
    pool.t1.reserve = formatUnits(pool.t1.reserve, pool.t1.decimals);
    const t0Info = addressToInfo[pool.t0.address.toLowerCase()] || {
      decimals: 18,
      symbol: "Unknown",
    };
    const t1Info = addressToInfo[pool.t1.address.toLowerCase()] || {
      decimals: 18,
      symbol: "Unknown",
    };

    return {
      ...pool,
      t0: { ...pool.t0, ...t0Info },
      t1: { ...pool.t1, ...t1Info },
    };
  });

  const tableData = {} as any;
  poolsWithSymbolsAndDecimals.forEach((pool) => {
    const r0 = parseFloat(pool.t0.reserve).toFixed(2);
    const r1 = parseFloat(pool.t1.reserve).toFixed(2);

    tableData[pool.pair] = {
      Pool: `${pool.t0.symbol} / ${pool.t1.symbol}`,
      Reserves: `${r0} / ${r1}`,
    };
  });

  if (args.json) {
    console.log(poolsWithSymbolsAndDecimals);
  } else {
    console.table(tableData);
  }
};

export const poolsTask = task("pools", "", main).addFlag(
  "json",
  "Print the result in JSON format"
);
