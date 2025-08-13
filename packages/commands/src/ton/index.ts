import { Command } from "commander";

import { depositCommand } from "./deposit";
import { depositAndCallCommand } from "./depositAndCall";

export const tonCommand = new Command("ton")
  .summary("TON commands")
  .description(
    "Interact from TON: deposit TON to ZetaChain or deposit and call contracts"
  )
  .addCommand(depositAndCallCommand)
  .addCommand(depositCommand)
  .helpCommand(false);
