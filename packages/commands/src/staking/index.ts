import { Command } from "commander";

import { delegateCommand } from "./delegate";
import { delegationsCommand } from "./delegations";
import { validatorsCommand } from "./validators";

export const stakingCommand = new Command("staking")
  .summary("Staking commands")
  .addCommand(validatorsCommand)
  .addCommand(delegateCommand)
  .addCommand(delegationsCommand)
  .helpCommand(false);
