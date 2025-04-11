import { Command } from "commander";

import { solanaEncodeCommand } from "./solanaEncode";
import { evmDepositCommand } from "./evmDeposit";

export const toolkitCommand = new Command("toolkit")
  .description("Local development environment")
  .helpCommand(false);

toolkitCommand.addCommand(solanaEncodeCommand);
toolkitCommand.addCommand(evmDepositCommand);
