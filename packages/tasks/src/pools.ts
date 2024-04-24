import { getAddress, ParamChainName } from "@zetachain/protocol-contracts";
import { formatUnits } from "ethers/lib/utils";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ZetaChainClient } from "../../client/src/";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const client = new ZetaChainClient({
    network: args.mainnet ? "mainnet" : "testnet",
  });

  const foreignCoins = await client.getForeignCoins();
  const pools = await client.getPools();

  const addressToInfo = foreignCoins.reduce((acc: any, coin: any) => {
    acc[coin.zrc20_contract_address.toLowerCase()] = {
      decimals: coin.decimals,
      symbol: coin.symbol,
    };
    return acc;
  }, {});

  const wzeta = getAddress(
    "zetaToken",
    `zeta_${client.network}` as ParamChainName
  );
  if (!wzeta) {
    throw new Error("Could not find the WZETA address");
  }
  const WZETA_ADDRESS = wzeta.toLowerCase();
  addressToInfo[WZETA_ADDRESS] = { decimals: 18, symbol: "WZETA" };

  const poolsWithSymbolsAndDecimals = pools.map((pool: any) => {
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
  poolsWithSymbolsAndDecimals.forEach((pool: any) => {
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

export const poolsTask = task("pools", "", main)
  .addFlag("json", "Print the result in JSON format")
  .addFlag("mainnet", "Run the task on mainnet");
