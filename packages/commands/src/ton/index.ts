import { Command } from "commander";

import { depositCommand } from "./deposit";
import { depositAndCallCommand } from "./depositAndCall";

export const tonCommand = new Command("ton")
  .description("TON commands")
  .addCommand(depositAndCallCommand)
  .addCommand(depositCommand)
  .helpCommand(false);
