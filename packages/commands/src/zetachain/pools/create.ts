import * as UniswapV3Factory from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";
import * as UniswapV3Pool from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";
import { Command } from "commander";
import { Contract, ethers, JsonRpcProvider, Wallet } from "ethers";

import {
  DEFAULT_FACTORY,
  DEFAULT_FEE,
  DEFAULT_RPC,
} from "../../../../../src/constants/pools";
import {
  type CreatePoolOptions,
  createPoolOptionsSchema,
  PoolCreationError,
} from "../../../../../types/pools";

const main = async (options: CreatePoolOptions): Promise<void> => {
  try {
    const validatedOptions = createPoolOptionsSchema.parse(options);

    if (validatedOptions.tokens.length !== 2) {
      throw new Error("Exactly 2 token addresses must be provided");
    }

    if (!validatedOptions.prices || validatedOptions.prices.length !== 2) {
      throw new Error("Exactly 2 prices must be provided using --prices");
    }

    const [price0, price1] = validatedOptions.prices.map(Number);
    if (price0 <= 0 || price1 <= 0 || isNaN(price0) || isNaN(price1)) {
      throw new Error("Both prices must be valid positive numbers");
    }

    // Initialize provider and signer
    const provider = new JsonRpcProvider(validatedOptions.rpc);
    const signer = new Wallet(validatedOptions.privateKey, provider);

    console.log("Creating Uniswap V3 pool...");
    console.log("Signer address:", await signer.getAddress());
    console.log(
      "Balance:",
      ethers.formatEther(await provider.getBalance(await signer.getAddress())),
      "ZETA"
    );

    // Initialize factory contract
    const uniswapV3FactoryInstance = new Contract(
      validatedOptions.factory,
      UniswapV3Factory.abi,
      signer
    );

    // Create the pool
    console.log("\nCreating pool...");
    const fee = validatedOptions.fee;
    const createPoolTx = (await uniswapV3FactoryInstance.createPool(
      validatedOptions.tokens[0],
      validatedOptions.tokens[1],
      fee
    )) as ethers.TransactionResponse;
    console.log("Pool creation transaction hash:", createPoolTx.hash);
    await createPoolTx.wait();

    // Get the pool address
    const poolAddress = (await uniswapV3FactoryInstance.getPool(
      validatedOptions.tokens[0],
      validatedOptions.tokens[1],
      fee
    )) as string;
    console.log("Pool deployed at:", poolAddress);

    // Initialize the pool
    const pool = new Contract(poolAddress, UniswapV3Pool.abi, signer);

    // Calculate sqrtPriceX96 from USD prices
    const initialPrice = price1 / price0;
    const sqrtPrice = Math.sqrt(initialPrice);
    const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * 2 ** 96));

    const initTx = (await pool.initialize(
      sqrtPriceX96
    )) as ethers.TransactionResponse;
    console.log("Pool initialization transaction hash:", initTx.hash);
    await initTx.wait();

    console.log("\nPool created and initialized successfully!");
    console.log("Pool address:", poolAddress);
  } catch (error) {
    const poolError = error as PoolCreationError;
    console.error("\nPool creation failed with error:");
    console.error("Error message:", poolError.message);
    if (poolError.receipt) {
      console.error("Transaction receipt:", poolError.receipt);
    }
    if (poolError.transaction) {
      console.error("Transaction details:", poolError.transaction);
    }
    process.exit(1);
  }
};

export const createCommand = new Command("create")
  .summary("Create a new Uniswap V3 pool")
  .requiredOption(
    "--private-key <privateKey>",
    "Private key for signing transactions"
  )
  .option("--rpc <rpc>", "RPC URL for the network", DEFAULT_RPC)
  .option(
    "--factory <factory>",
    "Uniswap V3 Factory contract address",
    DEFAULT_FACTORY
  )
  .requiredOption(
    "--tokens <tokens...>",
    "Token addresses for the pool (exactly 2 required)"
  )
  .option(
    "--fee <fee>",
    "Fee tier for the pool (3000 = 0.3%)",
    DEFAULT_FEE.toString()
  )
  .requiredOption(
    "--prices <prices...>",
    "USD prices of the two tokens in the same order as --tokens"
  )
  .action(main);
