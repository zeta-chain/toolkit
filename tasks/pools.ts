import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { formatUnits } from "ethers/lib/utils";

import { getPools } from "../helpers/pools";
import { getForeignCoins } from "../helpers/balances";
import { getAddress } from "@zetachain/protocol-contracts";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const foreignCoins = await getForeignCoins();
  const pools = await getPools();

  const addressToInfo = foreignCoins.reduce((acc: any, coin: any) => {
    acc[coin.zrc20_contract_address.toLowerCase()] = {
      symbol: coin.symbol,
      decimals: coin.decimals,
    };
    return acc;
  }, {});

  const wzeta = getAddress("zetaToken", "zeta_testnet");
  const WZETA_ADDRESS = wzeta.toLowerCase();
  addressToInfo[WZETA_ADDRESS] = { symbol: "WZETA", decimals: 18 };

  const poolsWithSymbolsAndDecimals = pools.map((pool) => {
    const t0Info = addressToInfo[pool.t0.address.toLowerCase()] || {
      symbol: "Unknown",
      decimals: 18,
    };
    const t1Info = addressToInfo[pool.t1.address.toLowerCase()] || {
      symbol: "Unknown",
      decimals: 18,
    };

    return {
      ...pool,
      t0: { ...pool.t0, ...t0Info },
      t1: { ...pool.t1, ...t1Info },
    };
  });

  const tableData = {} as any;
  poolsWithSymbolsAndDecimals.forEach((pool) => {
    const t0ReserveFormatted = parseFloat(
      formatUnits(pool.t0.reserve, pool.t0.decimals)
    ).toFixed(2);
    const t1ReserveFormatted = parseFloat(
      formatUnits(pool.t1.reserve, pool.t1.decimals)
    ).toFixed(2);

    tableData[pool.pair] = {
      Pool: `${pool.t0.symbol} / ${pool.t1.symbol}`,
      Reserves: `${t0ReserveFormatted} / ${t1ReserveFormatted}`,
    };
  });

  console.table(tableData);
};

export const poolsTask = task("pools", "", main).addFlag(
  "json",
  "Print the result in JSON format"
);
