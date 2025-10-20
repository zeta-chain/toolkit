import { Command } from "commander";

import { callCommand } from "./call";
import { depositCommand } from "./deposit";
import { depositAndCallCommand } from "./depositAndCall";

export const evmCommand = new Command("evm")
  .summary("Deposit tokens and call universal contracts from EVM")
  .description(
    "Interact from EVM chains: call contracts on ZetaChain or deposit tokens (with or without a call)."
  )
  .addCommand(callCommand)
  .addCommand(depositAndCallCommand)
  .addCommand(depositCommand)
  .helpCommand(false);
