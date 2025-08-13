import { Command } from "commander";

import { callCommand } from "./call";
import { depositCommand } from "./deposit";
import { depositAndCallCommand } from "./depositAndCall";
import { encodeCommand } from "./encode";

export const inscriptionCommand = new Command("inscription")
  .summary("Make a transaction using inscriptions")
  .description(
    "Use Bitcoin inscriptions to deposit BTC to ZetaChain or call contracts"
  )
  .alias("i")
  .addCommand(callCommand)
  .addCommand(depositAndCallCommand)
  .addCommand(depositCommand)
  .addCommand(encodeCommand)
  .helpCommand(false);
