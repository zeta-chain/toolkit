import { Command } from "commander";

import { encodeCommand } from "./encode";
import { inscriptionCommand } from "./inscription";

export const bitcoinCommand = new Command("bitcoin")
  .description("Bitcoin-related commands")
  .helpCommand(false);

bitcoinCommand.addCommand(encodeCommand);
bitcoinCommand.addCommand(inscriptionCommand);
