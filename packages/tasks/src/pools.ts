import { getAddress, ParamChainName } from "@zetachain/protocol-contracts";
import { formatUnits } from "ethers/lib/utils";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ZetaChainClient } from "../../client/src/";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const client = new ZetaChainClient({
    network: args.mainnet ? "mainnet" : "testnet",
  });

  const pools = await client.getPools();

  const poolsDisplay = pools.map((pool: any) => {
    return {
      ...pool,
      t0: {
        ...pool.t0,
        reserve: formatUnits(pool.t0.reserve, pool.t0.decimals),
      },
      t1: {
        ...pool.t1,
        reserve: formatUnits(pool.t1.reserve, pool.t1.decimals),
      },
    };
  });

  const tableData = {} as any;
  poolsDisplay.forEach((pool: any) => {
    const r0 = parseFloat(pool.t0.reserve);
    const r1 = parseFloat(pool.t1.reserve);

    tableData[pool.pair] = {
      Pool: `${pool.t0.symbol} / ${pool.t1.symbol}`,
      Reserves: `${r0} / ${r1}`,
    };
  });

  if (args.json) {
    console.log(pools);
  } else {
    console.table(tableData);
  }
};

export const poolsTask = task("pools", "", main)
  .addFlag("json", "Print the result in JSON format")
  .addFlag("mainnet", "Run the task on mainnet");
