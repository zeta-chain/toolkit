import { Command } from "commander";

import { solanaEncodeCommand } from "./solanaEncode";
import { bitcoinCommand } from "./bitcoin";

export const toolkitCommand = new Command("toolkit")
  .description("Local development environment")
  .helpCommand(false);

toolkitCommand.addCommand(solanaEncodeCommand);
toolkitCommand.addCommand(bitcoinCommand);
