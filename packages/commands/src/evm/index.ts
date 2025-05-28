import { Command } from "commander";

import { callCommand } from "./call";
import { depositCommand } from "./deposit";
import { depositAndCallCommand } from "./depositAndCall";

export const evmCommand = new Command("evm")
  .description("EVM commands")
  .addCommand(callCommand)
  .addCommand(depositAndCallCommand)
  .addCommand(depositCommand)
  .helpCommand(false);
