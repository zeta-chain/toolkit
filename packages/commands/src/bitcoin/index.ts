import { Command } from "commander";

import { inscriptionCommand } from "./inscription/";
import { memoCommand } from "./memo/";

export const bitcoinCommand = new Command("bitcoin")
  .description("Bitcoin-related commands")
  .addCommand(inscriptionCommand)
  .addCommand(memoCommand)
  .helpCommand(false);
