import { Command } from "commander";
import * as UniswapV3Factory from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";
import * as UniswapV3Pool from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";
import { ethers } from "ethers";
import { DEFAULT_RPC, DEFAULT_FACTORY, DEFAULT_FEE } from "./constants";

async function main(options: {
  privateKey: string;
  rpc: string;
  factory: string;
  tokens: string[];
  fee?: number;
}) {
  try {
    if (options.tokens.length !== 2) {
      throw new Error("Exactly 2 token addresses must be provided");
    }

    // Initialize provider and signer
    const provider = new ethers.JsonRpcProvider(options.rpc);
    const signer = new ethers.Wallet(options.privateKey, provider);

    console.log("Creating Uniswap V3 pool...");
    console.log("Signer address:", await signer.getAddress());
    console.log(
      "Balance:",
      ethers.formatEther(await provider.getBalance(await signer.getAddress())),
      "ZETA"
    );

    // Initialize factory contract
    const uniswapV3FactoryInstance = new ethers.Contract(
      options.factory,
      UniswapV3Factory.abi,
      signer
    );

    // Create the pool
    console.log("\nCreating pool...");
    const fee = options.fee || 3000; // Default to 0.3% fee tier
    const tx = await uniswapV3FactoryInstance.createPool(
      options.tokens[0],
      options.tokens[1],
      fee
    );
    console.log("Pool creation transaction hash:", tx.hash);
    await tx.wait();

    // Get the pool address
    const poolAddress = await uniswapV3FactoryInstance.getPool(
      options.tokens[0],
      options.tokens[1],
      fee
    );
    console.log("Pool deployed at:", poolAddress);

    // Initialize the pool
    const pool = new ethers.Contract(poolAddress, UniswapV3Pool.abi, signer);
    const sqrtPriceX96 = ethers.toBigInt("79228162514264337593543950336"); // sqrt(1) * 2^96
    const initTx = await pool.initialize(sqrtPriceX96);
    console.log("Pool initialization transaction hash:", initTx.hash);
    await initTx.wait();

    console.log("\nPool created and initialized successfully!");
    console.log("Pool address:", poolAddress);
  } catch (error: any) {
    console.error("\nPool creation failed with error:");
    console.error("Error message:", error.message);
    if (error.receipt) {
      console.error("Transaction receipt:", error.receipt);
    }
    if (error.transaction) {
      console.error("Transaction details:", error.transaction);
    }
    process.exit(1);
  }
}

export const createCommand = new Command("create")
  .description("Create a new Uniswap V3 pool")
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
  .action(main);
