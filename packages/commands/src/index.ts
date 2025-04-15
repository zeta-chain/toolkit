import { Command } from "commander";

import { balancesCommand } from "./balances";
import { solanaEncodeCommand } from "./solanaEncode";

export const toolkitCommand = new Command("toolkit")
  .description("Local development environment")
  .helpCommand(false);

toolkitCommand.addCommand(balancesCommand);
toolkitCommand.addCommand(solanaEncodeCommand);
