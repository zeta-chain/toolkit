import { Command } from "commander";

import { callCommand } from "./call";
import { depositCommand } from "./deposit";
import { depositAndCallCommand } from "./depositAndCall";

export const memoCommand = new Command("memo")
  .summary("Make a transaction using a memo (OP_RETURN)")
  .description(
    "Use OP_RETURN memo to deposit BTC to ZetaChain or call contracts"
  )
  .alias("m")
  .addCommand(callCommand)
  .addCommand(depositAndCallCommand)
  .addCommand(depositCommand)
  .helpCommand(false);
