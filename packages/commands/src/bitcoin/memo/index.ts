import { Command } from "commander";

import { callCommand } from "./call";
import { depositCommand } from "./deposit";
import { depositAndCallCommand } from "./depositAndCall";

export const memoCommand = new Command("memo")
  .description("Make a transaction using a memo (OP_RETURN)")
  .alias("m")
  .addCommand(callCommand)
  .addCommand(depositAndCallCommand)
  .addCommand(depositCommand)
  .helpCommand(false);
