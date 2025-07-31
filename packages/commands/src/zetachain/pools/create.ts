/********************************************************************
 * pools create — create a V3 pool and initialise it if required
 *******************************************************************/
import * as UniswapV3Factory from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";
import * as UniswapV3Pool from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";
import { Command } from "commander";
import { Contract, ethers, JsonRpcProvider, Wallet } from "ethers";

import {
  DEFAULT_FACTORY,
  DEFAULT_FEE,
  DEFAULT_RPC,
} from "../../../../../src/constants/pools";
import { IERC20Metadata__factory } from "../../../../../typechain-types";
import {
  type CreatePoolOptions,
  createPoolOptionsSchema,
  PoolCreationError,
} from "../../../../../types/pools";

/* ─── helpers ---------------------------------------------------- */
const SCALE = 1_000_000_000_000_000_000n; // 1e18
const TWO_192 = 1n << 192n;
function sqrtBig(n: bigint): bigint {
  // integer √
  if (n < 2n) return n;
  let x = n,
    y = (x + 1n) >> 1n;
  while (y < x) {
    x = y;
    y = (x + n / x) >> 1n;
  }
  return x;
}
/** sqrtPriceX96 = √(price₁ / price₀) × 2⁹⁶   (token1/token0) */
function buildSqrtPriceX96(
  usd0: number,
  usd1: number,
  dec0: number,
  dec1: number,
  cliToken0: boolean
): bigint {
  // USD prices mapped to factory order
  const pTok0 = BigInt(Math.round((cliToken0 ? usd0 : usd1) * 1e18));
  const pTok1 = BigInt(Math.round((cliToken0 ? usd1 : usd0) * 1e18));

  // token1/token0 ratio in base-units, scaled by 2¹⁹²
  const num = pTok1 * 10n ** BigInt(dec0); // p₁ × 10^dec₀
  const den = pTok0 * 10n ** BigInt(dec1); // p₀ × 10^dec₁
  const ratioX192 = (num << 192n) / den; // shift before divide
  if (ratioX192 === 0n) throw new Error("ratio underflow – raise precision");

  /* integer √ → Q64.96 */
  return sqrtBig(ratioX192);
}

/* ─── main ------------------------------------------------------- */
const main = async (raw: CreatePoolOptions) => {
  try {
    const o = createPoolOptionsSchema.parse(raw);
    const [usdB, usdA] = o.prices.map(Number);

    const provider = new JsonRpcProvider(o.rpc ?? DEFAULT_RPC);
    const signer = new Wallet(o.privateKey, provider);

    /* factory --------------------------------------------------- */
    const factory = new Contract(
      o.factory ?? DEFAULT_FACTORY,
      UniswapV3Factory.abi,
      signer
    );

    let poolAddr = await factory.getPool(
      o.tokens[0],
      o.tokens[1],
      o.fee ?? DEFAULT_FEE
    );

    if (poolAddr === ethers.ZeroAddress) {
      console.log("Creating pool …");
      const tx = await factory.createPool(
        o.tokens[0],
        o.tokens[1],
        o.fee ?? DEFAULT_FEE
      );
      await tx.wait();
      poolAddr = await factory.getPool(
        o.tokens[0],
        o.tokens[1],
        o.fee ?? DEFAULT_FEE
      );
      console.log("✦ createPool tx:", tx.hash);
    } else {
      console.log("Pool already exists:", poolAddr);
    }

    /* pool contract -------------------------------------------- */
    const pool = new Contract(poolAddr, UniswapV3Pool.abi, signer);
    const [token0, token1] = await Promise.all([pool.token0(), pool.token1()]);
    const [dec0, dec1] = await Promise.all([
      IERC20Metadata__factory.connect(token0, provider).decimals(),
      IERC20Metadata__factory.connect(token1, provider).decimals(),
    ]);

    /* compute initial sqrtPriceX96 ----------------------------- */
    const cliToken0 = token0.toLowerCase() === o.tokens[0].toLowerCase();
    const sqrtPriceX96 = buildSqrtPriceX96(
      usdA,
      usdB,
      Number(dec0),
      Number(dec1),
      cliToken0
    );

    /* check if initialised ------------------------------------- */
    let needInit = false;
    try {
      const slot0 = await pool.slot0();
      needInit = slot0.sqrtPriceX96 === 0n;
    } catch {
      needInit = true; // slot0() reverted → not initialised
    }

    if (needInit) {
      console.log("Initialising pool …");
      const tx = await pool.initialize(sqrtPriceX96);
      await tx.wait();
      console.log("✓ Pool initialised (tx:", tx.hash, ")");
    } else {
      console.log("Pool already initialised; skipped.");
    }

    console.log("✔ Done – pool address:", poolAddr);
  } catch (err) {
    const e = err as PoolCreationError;
    console.error("Pool creation failed:", e.message);
    if (e.transaction) console.error("tx:", e.transaction);
    if (e.receipt) console.error("receipt:", e.receipt);
    process.exit(1);
  }
};

/* ─── CLI ------------------------------------------------------- */
export const createCommand = new Command("create")
  .summary("Create a Uniswap V3 pool and initialise it at a USD price ratio")
  .requiredOption("--private-key <pk>", "Private key paying gas")
  .requiredOption("--tokens <addrs...>", "Two token addresses (CLI order)")
  .requiredOption(
    "--prices <usd...>",
    "USD prices for the tokens in same order"
  )
  .option(
    "--fee <fee>",
    "Fee tier (default 3000 = 0.3%)",
    DEFAULT_FEE.toString()
  )
  .option("--factory <addr>", "Uniswap V3 Factory", DEFAULT_FACTORY)
  .option("--rpc <url>", "JSON-RPC endpoint", DEFAULT_RPC)
  .action(main);
