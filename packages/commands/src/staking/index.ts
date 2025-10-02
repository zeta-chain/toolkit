import { Command } from "commander";

import { delegateCommand } from "./delegate";
import { delegationsCommand } from "./delegations";
import { validatorsCommand } from "./validators";
import { undelegateCommand } from "./undelegate";
import { redelegateCommand } from "./redelegate";

export const stakingCommand = new Command("staking")
  .summary("Staking commands")
  .addCommand(validatorsCommand)
  .addCommand(delegateCommand)
  .addCommand(undelegateCommand)
  .addCommand(redelegateCommand)
  .addCommand(delegationsCommand)
  .helpCommand(false);
