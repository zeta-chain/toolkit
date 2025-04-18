import { Command, Option } from "commander";
import { ethers } from "ethers";
import * as NonfungiblePositionManager from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import {
  DEFAULT_RPC,
  DEFAULT_FACTORY,
  DEFAULT_FEE,
  DEFAULT_POSITION_MANAGER,
} from "./constants";

async function main(options: {
  rpc: string;
  pool: string;
  amount0: string;
  amount1: string;
  recipient?: string;
  tickLower?: number;
  tickUpper?: number;
  privateKey: string;
}) {
  try {
    // Initialize provider and signer
    const provider = new ethers.JsonRpcProvider(options.rpc);
    const signer = new ethers.Wallet(options.privateKey, provider);

    // Initialize pool contract to get token addresses
    const pool = new ethers.Contract(
      options.pool,
      [
        "function token0() view returns (address)",
        "function token1() view returns (address)",
      ],
      provider
    );

    // Get token addresses
    const [token0, token1] = await Promise.all([pool.token0(), pool.token1()]);

    // Initialize token contracts to get decimals
    const token0Contract = new ethers.Contract(
      token0,
      [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)",
      ],
      signer
    );
    const token1Contract = new ethers.Contract(
      token1,
      [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)",
      ],
      signer
    );

    // Get token decimals
    const [decimals0, decimals1] = await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals(),
    ]);

    // Convert human-readable amounts to BigInt
    const amount0 = ethers.parseUnits(options.amount0, decimals0);
    const amount1 = ethers.parseUnits(options.amount1, decimals1);

    // Initialize position manager contract
    const positionManager = new ethers.Contract(
      DEFAULT_POSITION_MANAGER,
      NonfungiblePositionManager.abi,
      signer
    );

    // Approve tokens
    console.log("Approving tokens...");
    const approve0Tx = await token0Contract.approve(
      positionManager.target,
      amount0
    );
    const approve1Tx = await token1Contract.approve(
      positionManager.target,
      amount1
    );

    console.log("Waiting for approvals...");
    await Promise.all([approve0Tx.wait(), approve1Tx.wait()]);
    console.log("Tokens approved successfully");

    // Set default tick range if not provided
    const tickLower = options.tickLower ?? -887220;
    const tickUpper = options.tickUpper ?? 887220;

    // Use signer's address as recipient if not provided
    const recipient = options.recipient ?? (await signer.getAddress());

    // Prepare parameters for minting
    const params = {
      token0,
      token1,
      fee: DEFAULT_FEE,
      tickLower,
      tickUpper,
      amount0Desired: amount0,
      amount1Desired: amount1,
      amount0Min: 0n,
      amount1Min: 0n,
      recipient,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from now
    };

    // Send transaction
    console.log("Adding liquidity...");
    const tx = await positionManager.mint(params);
    const receipt = await tx.wait();

    // Parse transaction receipt to get token ID
    const iface = positionManager.interface;
    const transferEvent = receipt.logs
      .map((log: any) => {
        try {
          return iface.parseLog({
            data: log.data,
            topics: log.topics,
          });
        } catch (e) {
          return null;
        }
      })
      .find((event: any) => event?.name === "Transfer");

    if (!transferEvent) {
      throw new Error("Could not find Transfer event in transaction receipt");
    }

    const tokenId = transferEvent.args[2];

    console.log("\nLiquidity Added Successfully:");
    console.log("Transaction Hash:", tx.hash);
    console.log("Position NFT ID:", tokenId.toString());
    console.log("Recipient Address:", recipient);
  } catch (error: any) {
    console.error("\nFailed to add liquidity:");
    console.error("Error message:", error.message);
    process.exit(1);
  }
}

export const addCommand = new Command("add")
  .description("Add liquidity to a Uniswap V3 pool")
  .option("--rpc <rpc>", "RPC URL for the network", DEFAULT_RPC)
  .requiredOption("--pool <pool>", "Pool contract address")
  .requiredOption(
    "--amount0 <amount0>",
    "Amount of token0 to add (in human-readable format)"
  )
  .requiredOption(
    "--amount1 <amount1>",
    "Amount of token1 to add (in human-readable format)"
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
