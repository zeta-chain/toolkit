import { Command } from "commander";
import * as UniswapV3Pool from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";
import { ethers } from "ethers";

async function main(options: { rpc: string; pool: string }) {
  try {
    // Initialize provider
    const provider = new ethers.JsonRpcProvider(options.rpc);

    console.log("Fetching Uniswap V3 pool information...");
    console.log("Network:", (await provider.getNetwork()).name);

    // Initialize pool contract
    const pool = new ethers.Contract(options.pool, UniswapV3Pool.abi, provider);

    // Get pool information
    const [token0, token1, fee, tickSpacing, liquidity, slot0] =
      await Promise.all([
        pool.token0(),
        pool.token1(),
        pool.fee(),
        pool.tickSpacing(),
        pool.liquidity(),
        pool.slot0(),
      ]);

    // Calculate price from sqrtPriceX96
    const sqrtPriceX96 = slot0[0];
    const price = (Number(sqrtPriceX96) / 2 ** 96) ** 2;

    console.log("\nPool Information:");
    console.log("Pool Address:", options.pool);
    console.log("Token 0:", token0);
    console.log("Token 1:", token1);
    console.log("Fee Tier:", `${Number(fee) / 10000}%`);
    console.log("Tick Spacing:", tickSpacing.toString());
    console.log("Current Price:", price.toFixed(6));
    console.log("Liquidity:", liquidity.toString());
    console.log("Current Tick:", slot0[1].toString());
  } catch (error: any) {
    console.error("\nFailed to fetch pool information:");
    console.error("Error message:", error.message);
    process.exit(1);
  }
}

export const showCommand = new Command("show")
  .description("Show information about a Uniswap V3 pool")
  .option(
    "--rpc <rpc>",
    "RPC URL for the network",
    "https://zetachain-athens.g.allthatnode.com/archive/evm"
  )
  .requiredOption("--pool <pool>", "Pool contract address")
  .action(main);
