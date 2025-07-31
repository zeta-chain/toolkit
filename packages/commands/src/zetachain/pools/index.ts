import { Command } from "commander";

import { createCommand } from "./create";
import { deployCommand } from "./deploy";
import { liquidityCommand } from "./liquidity";
import { showCommand } from "./show";
import { swapCommand } from "./swap";

export const poolsCommand = new Command("pools")
  .summary("Interact with ZetaChain Uniswap v3 pools.")
  .description(
    "This command group provides a set of commands for managing and interacting with Uniswap v3 pools on ZetaChain. It includes functionality for deploying new pools, creating new pools, swapping tokens, and managing liquidity positions. Note: these commands are meant to be used for testing purposes only."
  )
  .alias("p")
  .addCommand(deployCommand)
  .addCommand(createCommand)
  .addCommand(swapCommand)
  .addCommand(showCommand)
  .addCommand(liquidityCommand);
