import { formatUnits } from "ethers/lib/utils";
import { task } from "hardhat/config";
import { z } from "zod";

import { ZetaChainClient } from "../../client/src/";

const poolsArgsSchema = z.object({
  json: z.boolean().optional(),
  mainnet: z.boolean().optional(),
});

type PoolsArgs = z.infer<typeof poolsArgsSchema>;

const main = async (args: PoolsArgs) => {
  const { data: parsedArgs, success, error } = poolsArgsSchema.safeParse(args);

  if (!success) {
    console.error("Invalid arguments:", error?.message);
    return;
  }

  const client = new ZetaChainClient({
    network: parsedArgs.mainnet ? "mainnet" : "testnet",
  });

  const pools = await client.getPools();

  const poolsDisplay = pools.map((pool) => {
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

  const tableData: Record<string, { Pool: string; Reserves: string }> = {};
  poolsDisplay.forEach((pool) => {
    const r0 = parseFloat(pool.t0.reserve);
    const r1 = parseFloat(pool.t1.reserve);

    tableData[pool.pair] = {
      Pool: `${pool.t0.symbol} / ${pool.t1.symbol}`,
      Reserves: `${r0} / ${r1}`,
    };
  });

  if (parsedArgs.json) {
    console.log(pools);
  } else {
    console.table(tableData);
  }
};

export const poolsTask = task("pools", "", main)
  .addFlag("json", "Print the result in JSON format")
  .addFlag("mainnet", "Run the task on mainnet");
