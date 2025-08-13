import { Command } from "commander";

import { listCommand } from "./list";
import { showCommand } from "./show";

export const chainsCommand = new Command("chains")
  .alias("c")
  .summary("View connected chain information.")
  .description(
    "Provides commands to list all chains connected to ZetaChain or view details about a specific chain by name or chain ID."
  )
  .addCommand(listCommand)
  .addCommand(showCommand)
  .helpCommand(false);
