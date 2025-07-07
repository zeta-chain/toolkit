import * as UniswapV3Factory from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";
import * as UniswapV3Pool from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";
import { Command } from "commander";
import { Contract, JsonRpcProvider, Wallet, ethers } from "ethers";

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
import { IERC20Metadata__factory } from "../../../../../typechain-types";

/* ╭─────────────────── helpers ────────────────────╮ */
const SCALE = 1_000_000_000_000_000_000n; // 1e18
const TWO_192 = 1n << 192n;

/** integer √ via Newton (both args BigInt) */
function sqrtBig(n: bigint): bigint {
  if (n < 0n) throw new Error("sqrt of negative");
  if (n < 2n) return n;
  let x0 = n >> 1n;
  let x1 = (x0 + n / x0) >> 1n;
  while (x1 < x0) {
    x0 = x1;
    x1 = (x0 + n / x0) >> 1n;
  }
  return x0;
}

/** build sqrtPriceX96 (Q64.96) for token1/token0 ratio in base-units */
function buildSqrtPriceX96(
  usd0: number,
  usd1: number,
  dec0: number,
  dec1: number,
  isCliOrderToken0: boolean
): bigint {
  // map USD prices into factory-sorted order
  const priceToken0Usd = isCliOrderToken0 ? usd0 : usd1;
  const priceToken1Usd = isCliOrderToken0 ? usd1 : usd0;

  // integer USD (6 decimals) to avoid FP
  const p0 = BigInt(Math.round(priceToken0Usd * Number(SCALE)));
  const p1 = BigInt(Math.round(priceToken1Usd * Number(SCALE)));

  // ratio (token1 / token0) in base units
  const ratio = (p0 * 10n ** BigInt(dec1)) / (p1 * 10n ** BigInt(dec0));
  console.log("Ratio:", ratio.toString());

  // sqrtPriceX96 = floor( sqrt(ratio) * 2^96 )
  return sqrtBig(ratio * TWO_192);
}
/* ╰───────────────────────────────────────────────╯ */

const main = async (raw: CreatePoolOptions): Promise<void> => {
  try {
    const o = createPoolOptionsSchema.parse(raw);
    const [usdA, usdB] = o.prices.map(Number);
    if (usdA <= 0 || usdB <= 0 || Number.isNaN(usdA) || Number.isNaN(usdB)) {
      throw new Error("--prices must be positive numbers");
    }

    const provider = new JsonRpcProvider(o.rpc ?? DEFAULT_RPC);
    const signer = new Wallet(o.privateKey, provider);

    /* ─── factory & existing pool check ─────────────────── */
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
      console.log("Creating pool…");
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

    /* ─── pool contract ─────────────────────────────────── */
    const pool = new Contract(poolAddr, UniswapV3Pool.abi, signer);
    const [token0, token1] = await Promise.all([pool.token0(), pool.token1()]);
    const [dec0, dec1] = await Promise.all([
      IERC20Metadata__factory.connect(token0, provider).decimals(),
      IERC20Metadata__factory.connect(token1, provider).decimals(),
    ]);

    /* ─── compute sqrtPriceX96 ──────────────────────────── */
    const isCliOrderToken0 = token0.toLowerCase() === o.tokens[0].toLowerCase();
    const sqrtPriceX96 = buildSqrtPriceX96(
      usdA,
      usdB,
      Number(dec0),
      Number(dec1),
      isCliOrderToken0
    );

    if (sqrtPriceX96 === 0n) {
      throw new Error(
        "Computed sqrtPriceX96 = 0. Check that your --prices have enough precision."
      );
    }

    /* ─── initialise if not yet initialised ─────────────── */
    const slot0 = await pool.slot0().catch(() => null);
    if (!slot0 || slot0.sqrtPriceX96 === 0n) {
      const initTx = await pool.initialize(sqrtPriceX96);
      await initTx.wait();
      console.log("✓ Pool initialised (tx:", initTx.hash, ")");
    } else {
      console.log("Pool already initialised; skipped.");
    }

    console.log("Done ✔  address =", poolAddr);
  } catch (err) {
    const e = err as PoolCreationError;
    console.error("Pool creation failed:", e.message);
    if (e.transaction) console.error("tx:", e.transaction);
    if (e.receipt) console.error("receipt:", e.receipt);
    process.exit(1);
  }
};

/* ─── CLI wiring ───────────────────────────────────────────── */
export const createCommand = new Command("create")
  .summary("Create & initialise a Uniswap V3 pool at a USD price ratio")
  .requiredOption("--private-key <pk>", "Private key paying gas")
  .requiredOption("--tokens <addrs...>", "Two token addresses (CLI order)")
  .requiredOption(
    "--prices <usd...>",
    "USD prices for the tokens in same order"
  )
  .option("--fee <fee>", "Fee tier (e.g. 3000 = 0.3%)", DEFAULT_FEE.toString())
  .option("--factory <addr>", "Uniswap V3 Factory", DEFAULT_FACTORY)
  .option("--rpc <url>", "JSON-RPC endpoint", DEFAULT_RPC)
  .action(main);
