import { Command } from "commander";

import { inscriptionCommand } from "./inscription/";
import { memoCommand } from "./memo/";

export const bitcoinCommand = new Command("bitcoin")
  .summary("Bitcoin commands")
  .description(
    "Work with Bitcoin to deposit BTC to ZetaChain or call contracts using inscriptions or OP_RETURN memo."
  )
  .alias("b")
  .addCommand(inscriptionCommand)
  .addCommand(memoCommand)
  .helpCommand(false);
