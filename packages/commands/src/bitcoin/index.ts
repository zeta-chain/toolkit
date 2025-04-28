import { Command } from "commander";

import { encodeCommand } from "./encode";
import { depositAndCallCommand } from "./depositAndCall";

export const bitcoinCommand = new Command("bitcoin")
  .description("Bitcoin-related commands")
  .helpCommand(false);

bitcoinCommand.addCommand(encodeCommand);
bitcoinCommand.addCommand(depositAndCallCommand);
