import { Command } from "commander";

import { depositCommand } from "./deposit";
import { depositAndCallCommand } from "./depositAndCall";

export const evmCommand = new Command("evm")
  .description("EVM commands")
  .addCommand(depositCommand)
  .addCommand(depositAndCallCommand)
  .helpCommand(false);
