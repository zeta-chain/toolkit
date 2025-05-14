import { Command } from "commander";

import { callCommand } from "./call";
import { depositCommand } from "./deposit";
import { depositAndCallCommand } from "./depositAndCall";
import { encodeCommand } from "./encode";
export const bitcoinCommand = new Command("bitcoin")
  .description("Bitcoin-related commands")
  .helpCommand(false);

bitcoinCommand.addCommand(callCommand);
bitcoinCommand.addCommand(depositAndCallCommand);
bitcoinCommand.addCommand(depositCommand);
bitcoinCommand.addCommand(encodeCommand);
