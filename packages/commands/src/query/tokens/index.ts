import { Command } from "commander";

import { listCommand } from "./list";
import { showCommand } from "./show";

export const tokensCommand = new Command("tokens")
  .alias("t")
  .summary("Work with tokens on ZetaChain")
  .description(
    "Provides commands to list all available ZRC-20 tokens or view detailed information about a specific token. Useful for discovering token metadata, contract addresses, and supported chains."
  )
  .addCommand(listCommand)
  .addCommand(showCommand)
  .helpCommand(false);
