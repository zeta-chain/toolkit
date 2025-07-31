import * as UniswapV3Factory from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";
import * as NonfungiblePositionManager from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import { Command } from "commander";
import {
  Contract,
  ContractTransactionReceipt,
  ContractTransactionResponse,
  ethers,
  JsonRpcProvider,
  Log,
  Wallet,
} from "ethers";
import inquirer from "inquirer";

// Type definitions for better type safety
type Slot0Result = {
  feeProtocol: number;
  observationCardinality: number;
  observationCardinalityNext: number;
  observationIndex: number;
  sqrtPriceX96: bigint;
  tick: bigint;
  unlocked: boolean;
};

import {
  DEFAULT_FACTORY,
  DEFAULT_FEE,
  DEFAULT_POSITION_MANAGER,
  DEFAULT_RPC,
} from "../../../../../../src/constants/pools";
import {
  type AddLiquidityOptions,
  addLiquidityOptionsSchema,
  MintParams,
} from "../../../../../../types/pools";

const main = async (options: AddLiquidityOptions): Promise<void> => {
  try {
    // 1. Validate CLI options
    const validatedOptions = addLiquidityOptionsSchema.parse(options);

    /**
     * 2. Bootstrap signer & provider
     */
    const provider = new JsonRpcProvider(validatedOptions.rpc ?? DEFAULT_RPC);
    const signer = new Wallet(validatedOptions.privateKey, provider);

    /**
     * 3. Parse token addresses from CLI
     */
    if (validatedOptions.tokens.length !== 2) {
      throw new Error("Exactly 2 token addresses must be provided");
    }

    const [inputTokenA, inputTokenB] = validatedOptions.tokens.map((addr) =>
      ethers.getAddress(addr)
    );

    /**
     * 4. Locate (or verify) the pool — order agnostic
     */
    const factory = new Contract(
      DEFAULT_FACTORY,
      UniswapV3Factory.abi,
      provider
    );

    const fee = Number(validatedOptions.fee ?? DEFAULT_FEE);

    const poolAddress = (await factory.getPool(
      inputTokenA,
      inputTokenB,
      fee
    )) as string;

    if (poolAddress === ethers.ZeroAddress) {
      throw new Error("No pool found for supplied token pair and fee tier");
    }

    /**
     * 5. Read canonical token ordering and current state from the pool
     */
    const pool = new Contract(
      poolAddress,
      [
        "function token0() view returns (address)",
        "function token1() view returns (address)",
        "function tickSpacing() view returns (int24)",
        "function liquidity() view returns (uint128)",
        "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
      ],
      provider
    );

    const poolToken0 = ethers.getAddress((await pool.token0()) as string);
    const poolToken1 = ethers.getAddress((await pool.token1()) as string);
    const tickSpacing = Number((await pool.tickSpacing()) as bigint);
    const slot0 = (await pool.slot0()) as Slot0Result;
    const currentTick = Number(slot0.tick);

    /**
     * 6. Build token helpers (decimals, symbol, balances, approve)
     */
    const tokenContracts: Record<string, Contract> = {};

    const getTokenContract = (addr: string): Contract => {
      if (!tokenContracts[addr]) {
        tokenContracts[addr] = new Contract(
          addr,
          [
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)",
            "function balanceOf(address) view returns (uint256)",
            "function approve(address,uint256) returns (bool)",
          ],
          signer
        );
      }
      return tokenContracts[addr];
    };

    const [decA, symA] = await Promise.all([
      getTokenContract(inputTokenA).decimals() as Promise<bigint>,
      getTokenContract(inputTokenA).symbol() as Promise<string>,
    ]).then(([d, s]) => [Number(d), s]);

    const [decB, symB] = await Promise.all([
      getTokenContract(inputTokenB).decimals() as Promise<bigint>,
      getTokenContract(inputTokenB).symbol() as Promise<string>,
    ]).then(([d, s]) => [Number(d), s]);

    /**
     * 7. Parse user-entered amounts (aligned with the order the user typed)
     */
    if (validatedOptions.amounts.length !== 2) {
      throw new Error("Exactly 2 amounts must be provided");
    }
    const amountA = ethers.parseUnits(validatedOptions.amounts[0], decA);
    const amountB = ethers.parseUnits(validatedOptions.amounts[1], decB);

    /**
     * 8. Ensure we pass token0/token1 in *pool* order. Swap amounts if needed.
     */
    const finalToken0 = poolToken0;
    const finalToken1 = poolToken1;

    let finalAmount0: bigint;
    let finalAmount1: bigint;
    let symbol0: string;
    let symbol1: string;

    if (inputTokenA === poolToken0) {
      // user's first address matches pool.token0 ⇒ no swap
      finalAmount0 = amountA;
      finalAmount1 = amountB;
      symbol0 = symA as string;
      symbol1 = symB as string;
    } else {
      // user supplied in reverse order ⇒ swap
      finalAmount0 = amountB;
      finalAmount1 = amountA;
      symbol0 = symB as string;
      symbol1 = symA as string;
    }

    /**
     * 9. Balance checks
     */
    const signerAddress = await signer.getAddress();

    const [balance0, balance1] = await Promise.all([
      getTokenContract(finalToken0).balanceOf(signerAddress) as Promise<bigint>,
      getTokenContract(finalToken1).balanceOf(signerAddress) as Promise<bigint>,
    ]);

    if (balance0 < finalAmount0) {
      throw new Error(`Insufficient ${symbol0} balance`);
    }
    if (balance1 < finalAmount1) {
      throw new Error(`Insufficient ${symbol1} balance`);
    }

    /**
     * 10. Smart tick range calculation and validation
     */
    let tickLower: number;
    let tickUpper: number;

    if (!validatedOptions.tickLower || !validatedOptions.tickUpper) {
      console.log(
        "\n⚠️  No tick range specified. Calculating default range..."
      );

      // Use a moderate range around current price
      const rangeWidth = 600; // Reasonable default range
      const rawLower = currentTick - rangeWidth;
      const rawUpper = currentTick + rangeWidth;

      tickLower = Math.floor(rawLower / tickSpacing) * tickSpacing;
      tickUpper = Math.ceil(rawUpper / tickSpacing) * tickSpacing;

      console.log(
        `✅ Using range: [${tickLower}, ${tickUpper}] (${
          tickUpper - tickLower
        } ticks)`
      );
      console.log(`   Current tick: ${currentTick}`);
    } else {
      const rawLower = Number(validatedOptions.tickLower);
      const rawUpper = Number(validatedOptions.tickUpper);

      tickLower = Math.floor(rawLower / tickSpacing) * tickSpacing;
      tickUpper = Math.floor(rawUpper / tickSpacing) * tickSpacing;

      // Validate user-provided range
      const rangeTicks = tickUpper - tickLower;
      const priceRangeFactor = Math.pow(1.0001, rangeTicks);

      if (priceRangeFactor > 10) {
        console.log(`\n🚨 WARNING: Extremely wide tick range detected!`);
        console.log(
          `   Range: [${tickLower}, ${tickUpper}] (${rangeTicks} ticks)`
        );
        console.log(`   Price range factor: ${priceRangeFactor.toFixed(2)}x`);
        console.log(`   This will heavily favor one token over the other!`);
        console.log(
          `   Consider using a smaller range around current tick: ${currentTick}\n`
        );

        if (validatedOptions.yes) {
          console.log("Proceeding with wide range (--yes flag set)");
        } else {
          const { continueAnyway } = (await inquirer.prompt([
            {
              default: false,
              message: "Continue with this wide range anyway?",
              name: "continueAnyway",
              type: "confirm",
            },
          ])) as { continueAnyway: boolean };

          if (!continueAnyway) {
            console.log("Cancelled. Please specify a narrower tick range.");
            return;
          }
        }
      }
    }

    if (tickLower >= tickUpper) {
      throw new Error("tickLower must be smaller than tickUpper");
    }

    // Check for low liquidity and warn user
    const poolLiquidity = (await pool.liquidity()) as bigint;
    const liquidityAmount = Number(poolLiquidity);

    if (liquidityAmount < 1000) {
      console.log(
        `\n⚠️  WARNING: This pool has very low liquidity (${liquidityAmount} units)`
      );
      console.log(
        `   • Token ratios may be heavily skewed until more liquidity is added`
      );
      console.log(
        `   • Your position will still earn fees and can be withdrawn later`
      );
      console.log(`   • Consider this normal for new/empty pools\n`);
    }

    /**
     * 11. Recipient & summary
     */
    const recipient = validatedOptions.recipient ?? signerAddress;

    console.log("\nTransaction Details:");
    console.log(`Pool:        ${poolAddress}`);
    console.log(`Fee tier:    ${fee / 10000}%`);
    console.log(`Token0:      ${symbol0} (${finalToken0})`);
    console.log(`Token1:      ${symbol1} (${finalToken1})`);
    console.log(
      `Amount0:     ${
        validatedOptions.amounts[inputTokenA === poolToken0 ? 0 : 1]
      }`
    );
    console.log(
      `Amount1:     ${
        validatedOptions.amounts[inputTokenA === poolToken0 ? 1 : 0]
      }`
    );
    console.log(`Tick range:  [${tickLower}, ${tickUpper}]`);
    console.log(`Recipient:   ${recipient}`);

    if (validatedOptions.yes) {
      console.log("Proceeding with transaction (--yes flag set)");
    } else {
      const { confirm } = (await inquirer.prompt([
        { message: "Proceed?", name: "confirm", type: "confirm" },
      ])) as { confirm: boolean };
      if (!confirm) {
        console.log("Cancelled by user");
        return;
      }
    }

    /**
     * 12. Approvals
     */
    console.log("Approving tokens...");
    const approve0Tx = (await getTokenContract(finalToken0).approve(
      DEFAULT_POSITION_MANAGER,
      finalAmount0
    )) as ContractTransactionResponse;
    const approve1Tx = (await getTokenContract(finalToken1).approve(
      DEFAULT_POSITION_MANAGER,
      finalAmount1
    )) as ContractTransactionResponse;
    await Promise.all([approve0Tx.wait(), approve1Tx.wait()]);
    console.log("Tokens approved");

    /**
     * 13. Set minimum amounts and mint position
     */
    const amount0Min = 1n; // Minimal slippage protection
    const amount1Min = 1n; // Minimal slippage protection

    const params: MintParams = {
      amount0Desired: finalAmount0,
      amount0Min,
      amount1Desired: finalAmount1,
      amount1Min,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
      fee: BigInt(fee),
      recipient,
      tickLower: BigInt(tickLower),
      tickUpper: BigInt(tickUpper),
      token0: finalToken0,
      token1: finalToken1,
    };

    const positionManager = new Contract(
      DEFAULT_POSITION_MANAGER,
      NonfungiblePositionManager.abi,
      signer
    );

    console.log("Minting position...");
    const mintTx = (await positionManager.mint(
      params
    )) as ContractTransactionResponse;
    const receipt = (await mintTx.wait()) as ContractTransactionReceipt;

    /**
     * 14. Extract NFT token ID from Transfer event
     */
    const iface = positionManager.interface;
    const transferLog = receipt.logs.find((l: Log) => {
      try {
        const parsed = iface.parseLog({ data: l.data, topics: l.topics });
        return parsed?.name === "Transfer";
      } catch {
        return false;
      }
    });

    const tokenId = transferLog
      ? (iface.parseLog(transferLog as Log)?.args?.[2] as bigint)?.toString() ??
        "<unknown>"
      : "<unknown>";

    console.log("\nLiquidity added successfully!");
    console.log(`Position NFT ID: ${tokenId}`);
    console.log(`Transaction:     ${mintTx.hash}`);
  } catch (err) {
    console.error("Failed to add liquidity:", (err as Error).message);
    process.exit(1);
  }
};

export const addCommand = new Command("add")
  .summary("Add liquidity to a Uniswap V3 pool")
  .description(
    "Add liquidity to a Uniswap V3 pool. If tick range is not specified, a reasonable default range around the current price will be calculated automatically."
  )
  .requiredOption("--private-key <pk>", "Private key")
  .requiredOption("--tokens <tokens...>", "Token addresses (2)")
  .requiredOption("--amounts <amounts...>", "Token amounts (2)")
  .option("--rpc <url>", "JSON-RPC endpoint", DEFAULT_RPC)
  .option(
    "--tick-lower <tick>",
    "Lower tick (optional, auto-calculated if not provided)"
  )
  .option(
    "--tick-upper <tick>",
    "Upper tick (optional, auto-calculated if not provided)"
  )
  .option("--fee <fee>", "Fee tier", "3000")
  .option("--recipient <address>", "Recipient address")
  .option("--yes", "Skip confirmation prompts", false)
  .action(main);
