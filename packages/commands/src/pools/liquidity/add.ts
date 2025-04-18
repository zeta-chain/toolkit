import * as UniswapV3Factory from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";
import * as NonfungiblePositionManager from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import { Command } from "commander";
import { Contract, ethers, JsonRpcProvider, Log, Wallet } from "ethers";
import inquirer from "inquirer";

import {
  DEFAULT_FACTORY,
  DEFAULT_FEE,
  DEFAULT_POSITION_MANAGER,
  DEFAULT_RPC,
} from "../constants";

interface AddLiquidityOptions {
  amounts: string[];
  privateKey: string;
  recipient?: string;
  rpc: string;
  tickLower?: number;
  tickUpper?: number;
  tokens: string[];
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

    // Get token addresses
    if (options.tokens.length !== 2) {
      throw new Error("Exactly 2 token addresses must be provided");
    }
    const [token0, token1]: [string, string] = [
      options.tokens[0],
      options.tokens[1],
    ];

    // Initialize token contracts to get decimals and symbols
    const token0Contract = new Contract(
      token0,
      [
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
      ],
      provider
    );
    const token1Contract = new Contract(
      token1,
      [
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
      ],
      provider
    );

    // Get token decimals and symbols
    const [decimals0, decimals1, symbol0, symbol1] = (await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals(),
      token0Contract.symbol(),
      token1Contract.symbol(),
    ])) as [number, number, string, string];

    // Convert human-readable amounts to BigInt
    const [amount0, amount1] = [
      ethers.parseUnits(options.amounts[0], decimals0),
      ethers.parseUnits(options.amounts[1], decimals1),
    ] as [bigint, bigint];

    // Initialize factory contract to check if pool exists
    const factory = new Contract(
      DEFAULT_FACTORY,
      UniswapV3Factory.abi,
      provider
    );

    // Check if pool exists
    const poolAddress = (await factory.getPool(
      token0,
      token1,
      DEFAULT_FEE
    )) as string;
    if (poolAddress === ethers.ZeroAddress) {
      throw new Error(
        `No pool exists for token pair ${symbol0}/${symbol1} with fee ${
          DEFAULT_FEE / 10000
        }%`
      );
    }

    // Check token balances
    const token0ContractForBalance = new Contract(
      token0,
      ["function balanceOf(address) view returns (uint256)"],
      provider
    );
    const token1ContractForBalance = new Contract(
      token1,
      ["function balanceOf(address) view returns (uint256)"],
      provider
    );

    const signerAddress = await signer.getAddress();
    const [balance0, balance1] = (await Promise.all([
      token0ContractForBalance.balanceOf(signerAddress),
      token1ContractForBalance.balanceOf(signerAddress),
    ])) as [bigint, bigint];

    if (balance0 < amount0) {
      throw new Error(
        `Insufficient ${symbol0} balance. Required: ${
          options.amounts[0]
        }, Available: ${ethers.formatUnits(balance0, decimals0)}`
      );
    }

    if (balance1 < amount1) {
      throw new Error(
        `Insufficient ${symbol1} balance. Required: ${
          options.amounts[1]
        }, Available: ${ethers.formatUnits(balance1, decimals1)}`
      );
    }

    // Use signer's address as recipient if not provided
    const recipient = options.recipient ?? signerAddress;

    // Set default tick range if not provided
    const tickLower = options.tickLower ?? -887220;
    const tickUpper = options.tickUpper ?? 887220;

    // Show transaction details and get confirmation
    console.log("\nTransaction Details:");
    console.log(`Token0 (${symbol0}): ${options.amounts[0]} (${token0})`);
    console.log(`Token1 (${symbol1}): ${options.amounts[1]} (${token1})`);
    console.log(`Pool Address: ${poolAddress}`);
    console.log(`Recipient: ${recipient}`);
    console.log(`Tick Range: [${tickLower}, ${tickUpper}]`);
    console.log(`Fee: ${DEFAULT_FEE / 10000}%`);
    console.log("\nBalances:");
    console.log(`${symbol0}: ${ethers.formatUnits(balance0, decimals0)}`);
    console.log(`${symbol1}: ${ethers.formatUnits(balance1, decimals1)}`);

    const { confirm } = (await inquirer.prompt([
      {
        default: false,
        message: "Do you want to proceed with the transaction?",
        name: "confirm",
        type: "confirm",
      },
    ])) as { confirm: boolean };

    if (!confirm) {
      console.log("Transaction cancelled by user");
      process.exit(0);
    }

    // Initialize token contracts for approval
    const token0ContractForApproval = new Contract(
      token0,
      ["function approve(address spender, uint256 amount) returns (bool)"],
      signer
    );
    const token1ContractForApproval = new Contract(
      token1,
      ["function approve(address spender, uint256 amount) returns (bool)"],
      signer
    );

    // Initialize position manager contract
    const positionManager = new Contract(
      DEFAULT_POSITION_MANAGER,
      NonfungiblePositionManager.abi,
      signer
    );

    // Approve tokens
    console.log("\nApproving tokens...");
    const approve0Tx = (await token0ContractForApproval.approve(
      positionManager.target,
      amount0
    )) as ethers.TransactionResponse;
    const approve1Tx = (await token1ContractForApproval.approve(
      positionManager.target,
      amount1
    )) as ethers.TransactionResponse;

    console.log("Waiting for approvals...");
    await Promise.all([approve0Tx.wait(), approve1Tx.wait()]);
    console.log("Tokens approved successfully");

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
    console.log("\nAdding liquidity...");
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
    console.log("Token 0 Address:", token0);
    console.log("Token 1 Address:", token1);
    console.log("Amount0:", options.amounts[0]);
    console.log("Amount1:", options.amounts[1]);
  } catch (error) {
    console.error("\nFailed to add liquidity:");
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
};

export const addCommand = new Command("add")
  .description("Add liquidity to a Uniswap V3 pool")
  .option("--rpc <rpc>", "RPC URL for the network", DEFAULT_RPC)
  .requiredOption(
    "--tokens <tokens...>",
    "Token addresses for the pool (exactly 2 required)"
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
