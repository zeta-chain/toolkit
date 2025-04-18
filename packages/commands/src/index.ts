import { Command } from "commander";

import { poolsCommand } from "./pools/";
import { accountsCommand } from "./accounts";
import { solanaEncodeCommand } from "./solanaEncode";

export const toolkitCommand = new Command("toolkit")
  .description("Local development environment")
  .helpCommand(false);

toolkitCommand
  .addCommand(solanaEncodeCommand)
  .addCommand(poolsCommand)
  .addCommand(solanaEncodeCommand)
  .addCommand(accountsCommand);
