import { Command } from "commander";

import { bitcoinCommand } from "./bitcoin";
import { solanaEncodeCommand } from "./solanaEncode";

export const toolkitCommand = new Command("toolkit")
  .description("Local development environment")
  .helpCommand(false);

toolkitCommand.addCommand(solanaEncodeCommand);
toolkitCommand.addCommand(bitcoinCommand);
