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
     * 4. Locate (or verify) the pool — order agnostic
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
     * 5. Read canonical token ordering from the pool
     */
    const pool = new Contract(
      poolAddress,
      [
        "function token0() view returns (address)",
        "function token1() view returns (address)",
        "function tickSpacing() view returns (int24)",
      ],
      provider
    );
    const poolToken0 = ethers.getAddress(await pool.token0());
    const poolToken1 = ethers.getAddress(await pool.token1());
    const tickSpacing = Number(await pool.tickSpacing());

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
      getTokenContract(inputTokenA).decimals(),
      getTokenContract(inputTokenA).symbol(),
    ]).then(([d, s]) => [Number(d), s as string]);

    const [decB, symB] = await Promise.all([
      getTokenContract(inputTokenB).decimals(),
      getTokenContract(inputTokenB).symbol(),
    ]).then(([d, s]) => [Number(d), s as string]);

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
     * 10. Tick range sanity & alignment
     */
    if (!validatedOptions.tickLower || !validatedOptions.tickUpper) {
      throw new Error("tickLower and tickUpper must be provided");
    }

    const rawLower = Number(validatedOptions.tickLower);
    const rawUpper = Number(validatedOptions.tickUpper);

    const tickLower = Math.floor(rawLower / tickSpacing) * tickSpacing;
    const tickUpper = Math.floor(rawUpper / tickSpacing) * tickSpacing;

    if (tickLower >= tickUpper) {
      throw new Error("tickLower must be smaller than tickUpper");
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

    const { confirm } = await inquirer.prompt([
      { message: "Proceed?", name: "confirm", type: "confirm" },
    ]);
    if (!confirm) {
      console.log("Cancelled by user");
      return;
    }

    /**
     * 12. Approvals
     */
    console.log("Approving tokens...");
    const approve0Tx = await getTokenContract(finalToken0).approve(
      DEFAULT_POSITION_MANAGER,
      finalAmount0
    );
    const approve1Tx = await getTokenContract(finalToken1).approve(
      DEFAULT_POSITION_MANAGER,
      finalAmount1
    );
    await Promise.all([approve0Tx.wait(), approve1Tx.wait()]);
    console.log("Tokens approved");

    /**
     * 13. Mint
     */
    const params: MintParams = {
      amount0Desired: finalAmount0,
      amount0Min: 0n,
      amount1Desired: finalAmount1,
      amount1Min: 0n,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
      fee,
      recipient,
      tickLower,
      tickUpper,
      token0: finalToken0,
      token1: finalToken1,
    };

    const positionManager = new Contract(
      DEFAULT_POSITION_MANAGER,
      NonfungiblePositionManager.abi,
      signer
    );

    console.log("Minting position...");
    const mintTx = await positionManager.mint(params);
    const receipt = await mintTx.wait();

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
      ? iface.parseLog(transferLog)?.args[2] ?? "<unknown>"
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
  .requiredOption("--private-key <pk>", "Private key")
  .requiredOption("--tokens <tokens...>", "Token addresses (2)")
  .requiredOption("--amounts <amounts...>", "Token amounts (2)")
  .option("--rpc <url>", "JSON-RPC endpoint", DEFAULT_RPC)
  .option("--tick-lower <tick>", "Lower tick")
  .option("--tick-upper <tick>", "Upper tick")
  .option("--fee <fee>", "Fee tier", "3000")
  .option("--recipient <address>", "Recipient address")
  .action(main);
