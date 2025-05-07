import { Command } from "commander";

import { depositCommand } from "./deposit";

export const evmCommand = new Command("evm")
  .description("EVM commands")
  .addCommand(depositCommand)
  .helpCommand(false);
