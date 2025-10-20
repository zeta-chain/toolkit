import { Command } from "commander";

import { callCommand } from "./call";
import { depositCommand } from "./deposit";
import { depositAndCallCommand } from "./depositAndCall";
import { encodeCommand } from "./encode";

export const solanaCommand = new Command("solana")
  .summary("Deposit tokens and call universal contracts from Solana")
  .description(
    "Interact from Solana: call contracts on ZetaChain or deposit tokens (with or without a call)."
  )
  .addCommand(callCommand)
  .addCommand(depositAndCallCommand)
  .addCommand(depositCommand)
  .addCommand(encodeCommand)
  .helpCommand(false);
