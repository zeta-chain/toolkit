import * as UniswapV3Factory from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";
import * as UniswapV3Pool from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";
import { Command, Option } from "commander";
import { Contract, ethers, JsonRpcProvider } from "ethers";

import { DEFAULT_FACTORY, DEFAULT_FEE, DEFAULT_RPC } from "./constants";

interface ShowPoolOptions {
  factory?: string;
  fee?: number;
  pool?: string;
  rpc: string;
  tokens?: string[];
}

interface Slot0Result {
  feeProtocol: number;
  observationCardinality: number;
  observationCardinalityNext: number;
  observationIndex: number;
  sqrtPriceX96: bigint;
  tick: number;
  unlocked: boolean;
}

const main = async (options: ShowPoolOptions): Promise<void> => {
  try {
    // Initialize provider
    const provider = new JsonRpcProvider(options.rpc);
    let poolAddress: string;
    if (options.pool) {
      poolAddress = options.pool;
    } else if (options.tokens) {
      if (options.tokens.length !== 2) {
        throw new Error("Exactly 2 token addresses must be provided");
      }

      // Initialize factory contract
      const factory = new Contract(
        options.factory ?? DEFAULT_FACTORY,
        UniswapV3Factory.abi,
        provider
      );

      // Get pool address from factory
      const fee = options.fee ?? 3000; // Default to 0.3% fee tier
      poolAddress = (await factory.getPool(
        options.tokens[0],
        options.tokens[1],
        fee
      )) as string;

      if (poolAddress === ethers.ZeroAddress) {
        throw new Error("Pool not found for the given tokens and fee tier");
      }
    } else {
      throw new Error("Either --pool or --tokens must be provided");
    }

    // Initialize pool contract
    const pool = new Contract(poolAddress, UniswapV3Pool.abi, provider);

    // Get pool information
    const [token0, token1, fee, tickSpacing, liquidity, slot0] =
      (await Promise.all([
        pool.token0(),
        pool.token1(),
        pool.fee(),
        pool.tickSpacing(),
        pool.liquidity(),
        pool.slot0(),
      ])) as [string, string, bigint, bigint, bigint, Slot0Result];

    // Calculate price from sqrtPriceX96
    const sqrtPriceX96 = slot0.sqrtPriceX96;
    const price = (Number(sqrtPriceX96) / 2 ** 96) ** 2;

    console.log("\nPool Information:");
    console.log("Pool Address:", poolAddress);
    console.log("Token 0:", token0);
    console.log("Token 1:", token1);
    console.log("Fee Tier:", `${Number(fee) / 10000}%`);
    console.log("Tick Spacing:", tickSpacing.toString());
    console.log("Current Price:", price.toFixed(6));
    console.log("Liquidity:", liquidity.toString());
    console.log("Current Tick:", slot0.tick.toString());
  } catch (error) {
    console.error("\nFailed to fetch pool information:");
    console.error(
      "Error message:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
};

export const showCommand = new Command("show")
  .description("Show information about a Uniswap V3 pool")
  .option("--rpc <rpc>", "RPC URL for the network", DEFAULT_RPC)
  .addOption(
    new Option("--pool <pool>", "Pool contract address").conflicts("tokens")
  )
  .addOption(
    new Option(
      "--tokens <tokens...>",
      "Token addresses for the pool (exactly 2 required)"
    ).conflicts("pool")
  )
  .option(
    "--factory <factory>",
    "Uniswap V3 Factory contract address",
    DEFAULT_FACTORY
  )
  .option(
    "--fee <fee>",
    "Fee tier for the pool (3000 = 0.3%)",
    DEFAULT_FEE.toString()
  )
  .action(main);
