import { Command } from "commander";

import { depositCommand } from "./deposit";
import { depositAndCallCommand } from "./depositAndCall";
import { encodeCommand } from "./encode";

export const suiCommand = new Command("sui")
  .summary("Sui commands")
  .description(
    "Interact from Sui: deposit tokens to ZetaChain or deposit and call contracts"
  )
  .addCommand(depositAndCallCommand)
  .addCommand(depositCommand)
  .addCommand(encodeCommand)
  .helpCommand(false);
