// src/cli/commands/pools/liquidity/remove.ts
import * as NonfungiblePositionManager from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import { Command } from "commander";
import { Contract, ethers, JsonRpcProvider, Wallet } from "ethers";
import inquirer from "inquirer";

import {
  DEFAULT_POSITION_MANAGER,
  DEFAULT_RPC,
} from "../../../../../../src/constants/pools";
import {
  type RemoveLiquidityOptions,
  removeLiquidityOptionsSchema,
} from "../../../../../../types/pools";

const MaxUint128 = (1n << 128n) - 1n; // 2¹²⁸-1

const main = async (options: RemoveLiquidityOptions): Promise<void> => {
  try {
    const o = removeLiquidityOptionsSchema.parse(options);

    /* ─── 1. Provider & signer ─────────────────────────────────────────────── */
    const provider = new JsonRpcProvider(o.rpc ?? DEFAULT_RPC);
    const signer = new Wallet(o.privateKey, provider);
    const pm = new Contract(
      DEFAULT_POSITION_MANAGER,
      NonfungiblePositionManager.abi,
      signer
    );

    /* ─── 2. Select a position NFT ─────────────────────────────────────────── */
    let tokenId = o.tokenId;
    if (!tokenId) {
      const bal = await pm.balanceOf(signer.address);
      if (bal === 0n) throw new Error("Signer owns no liquidity positions");

      const ids: bigint[] = [];
      for (let i = 0n; i < bal; i++) {
        ids.push(await pm.tokenOfOwnerByIndex(signer.address, i));
      }

      const { chosen } = await inquirer.prompt([
        {
          choices: ids.map((id) => ({ name: id.toString(), value: id })),
          message: "Select position to remove liquidity from",
          name: "chosen",
          type: "list",
        },
      ]);
      tokenId = chosen.toString();
    }

    /* ─── 3. Fetch position info ───────────────────────────────────────────── */
    const pos = await pm.positions(tokenId);
    const liquidity = pos.liquidity as bigint;
    if (liquidity === 0n) {
      console.log("Position already has zero liquidity");
      return;
    }

    console.log("\nPosition", tokenId!.toString());
    console.log("Liquidity:", liquidity.toString());
    console.log("Token0:", pos.token0);
    console.log("Token1:", pos.token1);
    if (
      !(
        await inquirer.prompt([
          {
            default: false,
            message: "Remove ALL liquidity and collect the tokens?",
            name: "ok",
            type: "confirm",
          },
        ])
      ).ok
    ) {
      process.exit(0);
    }

    /* ─── 4. decreaseLiquidity ─────────────────────────────────────────────── */
    const deadline = Math.floor(Date.now() / 1e3) + 60 * 20;
    const decTx = await pm.decreaseLiquidity({
      amount0Min: 0,
      amount1Min: 0,
      deadline,
      liquidity,
      tokenId,
    });
    await decTx.wait();
    console.log("✓ Liquidity removed (tx:", decTx.hash + ")");

    /* ─── 5. collect ───────────────────────────────────────────────────────── */
    const colTx = await pm.collect({
      amount0Max: MaxUint128,
      amount1Max: MaxUint128,
      recipient: signer.address,
      tokenId,
    });
    await colTx.wait();
    console.log("✓ Fees + principal collected (tx:", colTx.hash + ")");

    /* ─── 6. burn (optional) ───────────────────────────────────────────────── */
    if (o.burn) {
      const burnTx = await pm.burn(tokenId);
      await burnTx.wait();
      console.log("✓ Empty NFT burned (tx:", burnTx.hash + ")");
    }
  } catch (e) {
    console.error(
      "\nRemove-liquidity failed:",
      e instanceof Error ? e.message : e
    );
    process.exit(1);
  }
};

/* ─── CLI wiring ───────────────────────────────────────────────────────────── */
export const removeCommand = new Command("remove")
  .summary("Remove liquidity from a Uniswap V3 position")
  .option("--rpc <rpc>", "RPC URL", DEFAULT_RPC)
  .option("--token-id <id>", "Position NFT ID (prompted if omitted)")
  .option("--burn", "Burn the NFT after withdrawing", false)
  .requiredOption("--private-key <pk>", "Private key of the position owner")
  .action(main);
