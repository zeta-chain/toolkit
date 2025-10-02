import { Command } from "commander";

import { delegateCommand } from "./delegate";
import { delegationsCommand } from "./delegations";
import { redelegateCommand } from "./redelegate";
import { undelegateCommand } from "./undelegate";
import { validatorsCommand } from "./validators";

export const stakingCommand = new Command("staking")
  .summary("Staking commands")
  .addCommand(validatorsCommand)
  .addCommand(delegateCommand)
  .addCommand(undelegateCommand)
  .addCommand(redelegateCommand)
  .addCommand(delegationsCommand)
  .helpCommand(false);
