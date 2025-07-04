import { Command } from "commander";

import { listCommand } from "./list";
import { showCommand } from "./show";

export const tokensCommand = new Command("tokens")
  .alias("t")
  .description("ZRC-20 token commands")
  .addCommand(listCommand)
  .addCommand(showCommand)
  .helpCommand(false);
