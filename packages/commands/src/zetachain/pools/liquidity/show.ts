import * as NonfungiblePositionManager from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import { IERC20Metadata__factory } from "../../../../../../typechain-types";
import { Command } from "commander";
import { Contract, JsonRpcProvider, Wallet, ethers } from "ethers";
import {
  DEFAULT_POSITION_MANAGER,
  DEFAULT_FACTORY,
  DEFAULT_RPC,
} from "../../../../../../src/constants/pools";
import {
  ShowLiquidityOptions,
  showLiquidityOptionsSchema,
} from "../../../../../../types/pools";
import * as UniswapV3Factory from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";

const main = async (raw: ShowLiquidityOptions) => {
  try {
    /* ─── 1. Parse CLI options ───────────────────────────────────────────── */
    const o = showLiquidityOptionsSchema.parse(raw);
    const provider = new JsonRpcProvider(o.rpc);
    const signer = new Wallet(o.privateKey, provider);
    const addr = await signer.getAddress();

    /* ─── 2. Load contracts ──────────────────────────────────────────────── */
    const pm = new Contract(
      DEFAULT_POSITION_MANAGER,
      NonfungiblePositionManager.abi,
      provider
    );
    const fac = new Contract(DEFAULT_FACTORY, UniswapV3Factory.abi, provider);

    /* ─── 3. Enumerate NFTs ──────────────────────────────────────────────── */
    const bal = await pm.balanceOf(addr);
    if (bal === 0n) {
      console.log("No liquidity positions found for", addr);
      return;
    }
    console.log(`\n${bal.toString()} Uniswap V3 position(s) for ${addr}\n`);

    for (let i = 0n; i < bal; i++) {
      const id = await pm.tokenOfOwnerByIndex(addr, i);
      const pos = await pm.positions(id);

      const [
        token0,
        token1,
        fee,
        tickLower,
        tickUpper,
        liquidity,
        tokensOwed0,
        tokensOwed1,
      ] = [
        pos.token0,
        pos.token1,
        pos.fee,
        pos.tickLower,
        pos.tickUpper,
        pos.liquidity,
        pos.tokensOwed0,
        pos.tokensOwed1,
      ];

      /* symbols (fail-safe to address if call reverts) */
      const [sym0, sym1] = await Promise.all(
        [token0, token1].map(async (t) => {
          try {
            return await IERC20Metadata__factory.connect(t, provider).symbol();
          } catch {
            return t;
          }
        })
      );

      /* derive pool address (handy for UI links / debugging) */
      const pool = await fac.getPool(token0, token1, fee);

      console.log(`• NFT #${id.toString()}`);
      console.log(`  Pool      : ${pool}`);
      console.log(`  Pair      : ${sym0}/${sym1}`);
      console.log(`  Fee Tier  : ${Number(fee) / 1e4}%`);
      console.log(`  Ticks     : [${tickLower}, ${tickUpper}]`);
      console.log(`  Liquidity : ${liquidity.toString()}`);
      console.log(`  Owed0/Owed1: ${tokensOwed0} / ${tokensOwed1}`);
      console.log("");
    }
  } catch (e) {
    console.error("liquidity show failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  }
};

export const showCommand = new Command("show")
  .summary("List all Uniswap V3 liquidity position NFTs owned by the signer")
  .option("--rpc <rpc>", "RPC URL", DEFAULT_RPC)
  .requiredOption("--private-key <pk>", "Private key of the owner wallet")
  .action(main);
