/********************************************************************
 *  pools swap  – nudge a pool’s price to a target USD ratio
 *******************************************************************/
import * as UniswapV3Factory from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";
import * as UniswapV3Pool from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";
import * as SwapRouterArtifact from "@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json";
import { Command } from "commander";
import { Contract, ethers, JsonRpcProvider, Wallet } from "ethers";
import { z } from "zod";

import {
  DEFAULT_FACTORY,
  DEFAULT_RPC,
} from "../../../../../src/constants/pools";
import { IERC20Metadata__factory } from "../../../../../typechain-types";

const DEFAULT_SWAP_ROUTER = "0x42F98DfA0Bcca632b5e979E766331E7599b83686";
// const TWO_192 = 1n << 192n; // Removed as it's not used

/* √(bigint) ------------------------------------------------------ */
const sqrtBig = (n: bigint): bigint => {
  if (n < 2n) return n;
  let x = n,
    y = (x + 1n) >> 1n;
  while (y < x) {
    x = y;
    y = (x + n / x) >> 1n;
  }
  return x;
};

/* exact sqrtPriceX96 from USD prices ----------------------------- */
const calcSqrtPriceX96 = (
  usd0: number,
  usd1: number,
  dec0: number,
  dec1: number,
  cliIsTok0: boolean
): bigint => {
  // Use proper decimal handling to avoid floating point precision errors
  const FIX_SCALE = 18;

  // Helper function to convert decimal to BigInt with proper scaling
  const decimalToBigInt = (value: number): bigint => {
    const str = value.toFixed(FIX_SCALE);
    const [whole, fraction = ""] = str.split(".");
    const paddedFraction = fraction.padEnd(FIX_SCALE, "0");
    return BigInt(whole + paddedFraction);
  };

  const p0 = decimalToBigInt(cliIsTok0 ? usd0 : usd1); // token0 USD * 10^18
  const p1 = decimalToBigInt(cliIsTok0 ? usd1 : usd0); // token1 USD * 10^18

  // token1/token0 ratio in base-units, scaled by 2^192 for Q64.96
  const num = p1 * 10n ** BigInt(dec0); // p1 × 10^dec0
  const den = p0 * 10n ** BigInt(dec1); // p0 × 10^dec1
  if (num === 0n || den === 0n) throw new Error("bad price inputs");

  const ratioX192 = (num << 192n) / den; // (token1/token0) × 2^192
  return sqrtBig(ratioX192);
};

/* ------------- CLI schema -------------------------------------- */
const swapOpts = z.object({
  amountIn: z.string().default("1"),
  approve: z.boolean().default(true),
  fee: z.string().default("3000"),
  prices: z.array(z.string()).length(2),
  privateKey: z.string(),
  router: z.string().default(DEFAULT_SWAP_ROUTER),
  rpc: z.string().default(DEFAULT_RPC),
  tokens: z.array(z.string()).length(2),
});
type SwapOpts = z.infer<typeof swapOpts>;

/* ------------- main -------------------------------------------- */
const main = async (raw: SwapOpts) => {
  const o = swapOpts.parse(raw);
  const provider = new JsonRpcProvider(o.rpc);
  const signer = new Wallet(o.privateKey, provider);
  const [usdA, usdB] = o.prices.map(Number);

  /* factory / pool */
  const factory = new Contract(DEFAULT_FACTORY, UniswapV3Factory.abi, provider);
  const poolAddr = (await factory.getPool(
    o.tokens[0],
    o.tokens[1],
    Number(o.fee)
  )) as string;
  if (poolAddr === ethers.ZeroAddress) throw new Error("Pool not found");

  const pool = new Contract(poolAddr, UniswapV3Pool.abi, provider);
  const [token0, token1] = (await Promise.all([
    pool.token0(),
    pool.token1(),
  ])) as [string, string];
  const [dec0Big, dec1Big] = await Promise.all([
    IERC20Metadata__factory.connect(token0, provider).decimals(),
    IERC20Metadata__factory.connect(token1, provider).decimals(),
  ]);
  const dec0 = Number(dec0Big);
  const dec1 = Number(dec1Big);

  const cliIsTok0 = token0.toLowerCase() === o.tokens[0].toLowerCase();
  const sqrtLimit = calcSqrtPriceX96(usdA, usdB, dec0, dec1, cliIsTok0);

  const slot0 = (await pool.slot0()) as { sqrtPriceX96: bigint };
  const current = slot0.sqrtPriceX96;
  const zeroForOne = sqrtLimit < current; // direction

  const tokenIn = zeroForOne ? token1 : token0;
  const decimalsIn = zeroForOne ? dec1 : dec0;
  const amountIn = ethers.parseUnits(o.amountIn, decimalsIn);

  console.log("Pool :", poolAddr);
  console.log("√P now :", current.toString());
  console.log("√P tgt :", sqrtLimit.toString());
  console.log("swap   :", zeroForOne ? "token1 → token0" : "token0 → token1");

  /* approve */
  if (o.approve) {
    const erc20 = IERC20Metadata__factory.connect(tokenIn, signer);
    const allowance = await erc20.allowance(
      await signer.getAddress(),
      o.router
    );
    if (allowance < amountIn) {
      console.log("Approving", o.amountIn, "…");
      const tx = await erc20.approve(o.router, amountIn);
      await tx.wait();
    }
  }

  /* router swap */
  const router = new Contract(o.router, SwapRouterArtifact.abi, signer);
  const params = {
    amountIn,
    amountOutMinimum: 0,
    deadline: Math.floor(Date.now() / 1e3) + 600,
    fee: Number(o.fee),
    recipient: await signer.getAddress(),
    sqrtPriceLimitX96: sqrtLimit,
    tokenIn,
    tokenOut: zeroForOne ? token0 : token1,
  } as const;

  const tx = (await router.exactInputSingle(params, { gasLimit: 900_000 })) as {
    hash: string;
    wait: () => Promise<void>;
  };
  console.log("tx:", tx.hash, "– waiting…");
  await tx.wait();
  console.log("✓ Done.  Verify with `pools show`.");
};

/* ------------- export command ---------------------------------- */
export const swapCommand = new Command("swap")
  .summary("Push a pool’s price to a target USD ratio with one swap")
  .requiredOption("--private-key <pk>", "Signer private key")
  .requiredOption("--tokens <addrs...>", "Two token addresses (CLI order)")
  .requiredOption("--prices <usd...>", "USD prices (tokenA tokenB)")
  .option("--fee <fee>", "Fee tier (default 3000)", "3000")
  .option("--amount-in <amt>", "Input token amount (default 1)", "1")
  .option("--no-approve", "Skip ERC-20 approve step")
  .option("--router <addr>", "SwapRouter address", DEFAULT_SWAP_ROUTER)
  .option("--rpc <url>", "JSON-RPC endpoint", DEFAULT_RPC)
  .action(main);
