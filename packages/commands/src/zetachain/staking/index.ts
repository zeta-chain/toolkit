import { Command } from "commander";

import { delegateCommand } from "./delegate";

export const stakingCommand = new Command("staking")
  .summary("Staking commands")
  .addCommand(delegateCommand)
  .helpCommand(false);
