import { Command } from "commander";

import { inscriptionCommand } from "./inscription/";
import { memoCommand } from "./memo/";

export const bitcoinCommand = new Command("bitcoin")
  .summary("Deposit BTC and call universal contracts from Bitcoin")
  .description(
    "Work with Bitcoin to deposit BTC to ZetaChain or call contracts using inscriptions or OP_RETURN memo."
  )
  .alias("b")
  .addCommand(inscriptionCommand)
  .addCommand(memoCommand)
  .helpCommand(false);
