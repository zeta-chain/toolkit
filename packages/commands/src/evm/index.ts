import { Command } from "commander";

import { callCommand } from "./call";
import { depositCommand } from "./deposit";
import { depositAndCallCommand } from "./depositAndCall";

export const evmCommand = new Command("evm")
  .summary("EVM commands")
  .description(
    "Interact from EVM chains: call contracts on ZetaChain or deposit tokens (with or without a call)."
  )
  .addCommand(callCommand)
  .addCommand(depositAndCallCommand)
  .addCommand(depositCommand)
  .helpCommand(false);
