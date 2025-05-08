import { Command } from "commander";

import { depositCommand } from "./deposit";
import { depositAndCallCommand } from "./depositAndCall";
import { encodeCommand } from "./encode";
import { callCommand } from "./call";
export const bitcoinCommand = new Command("bitcoin")
  .description("Bitcoin-related commands")
  .helpCommand(false);

bitcoinCommand.addCommand(depositAndCallCommand);
bitcoinCommand.addCommand(depositCommand);
bitcoinCommand.addCommand(callCommand);
bitcoinCommand.addCommand(encodeCommand);
