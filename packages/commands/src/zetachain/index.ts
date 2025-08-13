import { Command } from "commander";

import { callCommand } from "./call";
import { withdrawCommand } from "./withdraw";
import { withdrawAndCallCommand } from "./withdrawAndCall";

export const zetachainCommand = new Command("zetachain")
  .summary("Withdraw tokens and call contracts on connected chains")
  .description(
    "Provides commands to call contracts, withdraw tokens, or withdraw tokens and call contracts on any connected chain from ZetaChain. Supports both pure contract calls and calls with asset transfers, with full control over gas limits, revert handling, and execution parameters."
  )
  .alias("z")
  .addCommand(callCommand)
  .addCommand(withdrawCommand)
  .addCommand(withdrawAndCallCommand)
  .helpCommand(false);
