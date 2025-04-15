import { Command } from "commander";

import { encodeCommand } from "./encode";

export const bitcoinCommand = new Command("bitcoin")
  .description("Bitcoin-related commands")
  .helpCommand(false);

bitcoinCommand.addCommand(encodeCommand);
