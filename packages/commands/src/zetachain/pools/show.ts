import * as UniswapV3Factory from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";
import * as UniswapV3Pool from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";
import { Command, Option } from "commander";
import { Contract, ethers, JsonRpcProvider } from "ethers";

import {
  DEFAULT_FACTORY,
  DEFAULT_FEE,
  DEFAULT_RPC,
} from "../../../../../src/constants/pools";
import { IERC20Metadata__factory } from "../../../../../typechain-types";
import {
  type ShowPoolOptions,
  showPoolOptionsSchema,
  Slot0Result,
} from "../../../../../types/pools";

// Helper function to get token symbol
const getTokenSymbol = async (
  provider: JsonRpcProvider,
  tokenAddress: string
): Promise<string> => {
  try {
    const token = IERC20Metadata__factory.connect(tokenAddress, provider);
    const symbol = await token.symbol();
    return symbol;
  } catch (error) {
    // If symbol call fails, return the address
    return tokenAddress;
  }
};

const main = async (options: ShowPoolOptions): Promise<void> => {
  try {
    // Validate options
    const validatedOptions = showPoolOptionsSchema.parse(options);

    // Initialize provider
    const provider = new JsonRpcProvider(validatedOptions.rpc);
    let poolAddress: string;
    if (validatedOptions.pool) {
      poolAddress = validatedOptions.pool;
    } else if (validatedOptions.tokens) {
      if (validatedOptions.tokens.length !== 2) {
        throw new Error("Exactly 2 token addresses must be provided");
      }

      // Initialize factory contract
      const factory = new Contract(
        validatedOptions.factory,
        UniswapV3Factory.abi,
        provider
      );

      // Get pool address from factory
      const fee = validatedOptions.fee;
      poolAddress = (await factory.getPool(
        validatedOptions.tokens[0],
        validatedOptions.tokens[1],
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

    // Get token symbols and decimals (decimals needed for accurate price calculation)
    const [token0Symbol, token1Symbol, dec0, dec1] = await Promise.all([
      getTokenSymbol(provider, token0),
      getTokenSymbol(provider, token1),
      IERC20Metadata__factory.connect(token0, provider).decimals(),
      IERC20Metadata__factory.connect(token1, provider).decimals(),
    ]);

    // Calculate price from sqrtPriceX96 accounting for token decimals
    const sqrtPriceX96 = slot0.sqrtPriceX96;

    // Use BigInt arithmetic to avoid precision loss for large sqrtPriceX96 values
    // sqrtPrice = sqrtPriceX96 / 2^96, price = sqrtPrice^2
    // We'll work with scaled integers throughout to maintain precision
    const SCALE_FACTOR = 10n ** 18n; // Scale factor for calculations

    // Calculate (sqrtPriceX96)^2 / (2^96)^2 * SCALE_FACTOR
    const priceScaled =
      (sqrtPriceX96 * sqrtPriceX96 * SCALE_FACTOR) / 2n ** 192n;

    // Adjust for token decimals to get token-level price
    const decDiff = Number(dec0) - Number(dec1);
    const decimalAdjustment =
      decDiff >= 0 ? 10n ** BigInt(decDiff) : 10n ** BigInt(-decDiff);

    const priceToken1PerToken0Scaled =
      decDiff >= 0
        ? priceScaled / decimalAdjustment
        : priceScaled * decimalAdjustment;

    // Convert to number for display (safe now since we've maintained precision through calculations)
    const priceToken1PerToken0 =
      Number(priceToken1PerToken0Scaled) / Number(SCALE_FACTOR);
    const priceToken0PerToken1 = 1 / priceToken1PerToken0;

    console.log("\nPool Information:");
    console.log("Pool Address:", poolAddress);
    console.log("Token 0:", `${token0Symbol} (${token0})`);
    console.log("Token 1:", `${token1Symbol} (${token1})`);
    console.log("Fee Tier:", `${Number(fee) / 10000}%`);
    console.log("Tick Spacing:", tickSpacing.toString());
    console.log(
      `1 ${token0Symbol} = ${priceToken1PerToken0.toFixed(6)} ${token1Symbol}`
    );
    console.log(
      `1 ${token1Symbol} = ${priceToken0PerToken1.toFixed(6)} ${token0Symbol}`
    );
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
  .summary("Show information about a Uniswap V3 pool")
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
