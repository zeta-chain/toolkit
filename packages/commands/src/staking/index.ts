import { Command } from "commander";

import { delegateCommand } from "./delegate";
import { delegationsCommand } from "./delegations";
import { validatorsCommand } from "./validators";
import { undelegateCommand } from "./undelegate";

export const stakingCommand = new Command("staking")
  .summary("Staking commands")
  .addCommand(validatorsCommand)
  .addCommand(delegateCommand)
  .addCommand(undelegateCommand)
  .addCommand(delegationsCommand)
  .helpCommand(false);
