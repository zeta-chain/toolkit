import { Command } from "commander";

import { depositCommand } from "./deposit";
import { depositAndCallCommand } from "./depositAndCall";

export const tonCommand = new Command("ton")
  .summary("Deposit tokens and call universal contracts from TON")
  .description(
    "Interact from TON: deposit TON to ZetaChain or deposit and call contracts"
  )
  .addCommand(depositAndCallCommand)
  .addCommand(depositCommand)
  .helpCommand(false);
