import { Command } from "commander";

import { solanaEncodeCommand } from "./solanaEncode";
import { poolsCommand } from "./pools/";

export const toolkitCommand = new Command("toolkit")
  .description("Local development environment")
  .helpCommand(false);

toolkitCommand.addCommand(solanaEncodeCommand).addCommand(poolsCommand);
