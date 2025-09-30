import { Command } from "commander";

import { delegateCommand } from "./delegate";
import { validatorsCommand } from "./validators";

export const stakingCommand = new Command("staking")
  .summary("Staking commands")
  .addCommand(validatorsCommand)
  .addCommand(delegateCommand)
  .helpCommand(false);
