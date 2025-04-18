import * as NonfungiblePositionManager from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import { Command, Option } from "commander";
import { Contract, ethers, JsonRpcProvider, Log, Wallet } from "ethers";

import {
  DEFAULT_FEE,
  DEFAULT_POSITION_MANAGER,
  DEFAULT_RPC,
} from "../constants";

interface AddLiquidityOptions {
  amounts: string[];
  pool?: string;
  privateKey: string;
  recipient?: string;
  rpc: string;
  tickLower?: number;
  tickUpper?: number;
  tokens?: string[];
}

interface MintParams {
  amount0Desired: bigint;
  amount0Min: bigint;
  amount1Desired: bigint;
  amount1Min: bigint;
  deadline: number;
  fee: number;
  recipient: string;
  tickLower: number;
  tickUpper: number;
  token0: string;
  token1: string;
}

const main = async (options: AddLiquidityOptions): Promise<void> => {
  try {
    // Initialize provider and signer
    const provider = new JsonRpcProvider(options.rpc);
    const signer = new Wallet(options.privateKey, provider);

    let token0: string;
    let token1: string;

    if (options.pool) {
      // Initialize pool contract to get token addresses
      const pool = new Contract(
        options.pool,
        [
          "function token0() view returns (address)",
          "function token1() view returns (address)",
        ],
        provider
      );

      // Get token addresses from pool
      [token0, token1] = (await Promise.all([
        pool.token0(),
        pool.token1(),
      ])) as [string, string];
    } else if (options.tokens && options.tokens.length === 2) {
      // Use provided token addresses
      [token0, token1] = options.tokens;
    } else {
      throw new Error(
        "Either pool address or two token addresses must be provided"
      );
    }

    // Initialize token contracts to get decimals
    const token0Contract = new Contract(
      token0,
      [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)",
      ],
      signer
    );
    const token1Contract = new Contract(
      token1,
      [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)",
      ],
      signer
    );

    // Get token decimals
    const [decimals0, decimals1] = (await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals(),
    ])) as [number, number];

    // Convert human-readable amounts to BigInt
    const amount0 = ethers.parseUnits(options.amounts[0], decimals0);
    const amount1 = ethers.parseUnits(options.amounts[1], decimals1);

    // Initialize position manager contract
    const positionManager = new Contract(
      DEFAULT_POSITION_MANAGER,
      NonfungiblePositionManager.abi,
      signer
    );

    // Approve tokens
    console.log("Approving tokens...");
    const approve0Tx = (await token0Contract.approve(
      positionManager.target,
      amount0
    )) as ethers.TransactionResponse;
    const approve1Tx = (await token1Contract.approve(
      positionManager.target,
      amount1
    )) as ethers.TransactionResponse;

    console.log("Waiting for approvals...");
    await Promise.all([approve0Tx.wait(), approve1Tx.wait()]);
    console.log("Tokens approved successfully");

    // Set default tick range if not provided
    const tickLower = options.tickLower ?? -887220;
    const tickUpper = options.tickUpper ?? 887220;

    // Use signer's address as recipient if not provided
    const recipient = options.recipient ?? (await signer.getAddress());

    // Prepare parameters for minting
    const params: MintParams = {
      amount0Desired: amount0,
      amount0Min: 0n,
      amount1Desired: amount1,
      amount1Min: 0n,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
      fee: DEFAULT_FEE,
      recipient,
      tickLower,
      tickUpper,
      token0,
      token1,
    };

    // Send transaction
    console.log("Adding liquidity...");
    const tx = (await positionManager.mint(
      params
    )) as ethers.TransactionResponse;
    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }

    // Parse transaction receipt to get token ID
    const iface = positionManager.interface;
    const transferEvent = receipt.logs
      .map((log: Log) => {
        try {
          return iface.parseLog({
            data: log.data,
            topics: log.topics,
          });
        } catch {
          return null;
        }
      })
      .find((event) => event?.name === "Transfer");

    if (!transferEvent) {
      throw new Error("Could not find Transfer event in transaction receipt");
    }

    const tokenId = transferEvent.args[2] as bigint;

    console.log("\nLiquidity Added Successfully:");
    console.log("Transaction Hash:", tx.hash);
    console.log("Position NFT ID:", tokenId.toString());
    console.log("Recipient Address:", recipient);
  } catch (error) {
    console.error("\nFailed to add liquidity:");
    console.error(
      "Error message:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
};

export const addCommand = new Command("add")
  .description("Add liquidity to a Uniswap V3 pool")
  .option("--rpc <rpc>", "RPC URL for the network", DEFAULT_RPC)
  .option("--pool <pool>", "Pool contract address")
  .addOption(
    new Option(
      "--tokens <tokens...>",
      "Token addresses for the pool (exactly 2 required)"
    ).conflicts("pool")
  )
  .requiredOption(
    "--amounts <amounts...>",
    "Amounts of tokens to add (in human-readable format, e.g. 0.1 5)"
  )
  .option(
    "--recipient <recipient>",
    "Address that will receive the liquidity position NFT (defaults to signer's address)"
  )
  .requiredOption(
    "--private-key <privateKey>",
    "Private key of the account that will send the transaction"
  )
  .option("--tick-lower <tickLower>", "Lower tick of the position", "-887220")
  .option("--tick-upper <tickUpper>", "Upper tick of the position", "887220")
  .action(main);
