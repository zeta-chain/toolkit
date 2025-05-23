import { Command } from "commander";

import { callCommand } from "./call";
import { depositCommand } from "./deposit";
import { depositAndCallCommand } from "./depositAndCall";
import { encodeCommand } from "./encode";

export const memoCommand = new Command("memo")
  .description("Make a transaction using a memo (OP_RETURN)")
  .alias("m")
  .addCommand(callCommand)
  .addCommand(depositAndCallCommand)
  .addCommand(depositCommand)
  .addCommand(encodeCommand)
  .helpCommand(false);
