import { Command } from "commander";

import { depositCommand } from "./deposit";

export const tonCommand = new Command("ton")
  .description("TON commands")
  .addCommand(depositCommand)
  .helpCommand(false);
