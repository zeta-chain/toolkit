import { Command } from "commander";

import { callCommand } from "./call";
import { withdrawCommand } from "./withdraw";
import { withdrawAndCallCommand } from "./withdrawAndCall";
import { stakingCommand } from "./staking";

export const zetachainCommand = new Command("zetachain")
  .summary("ZetaChain commands")
  .alias("z")
  .addCommand(callCommand)
  .addCommand(withdrawCommand)
  .addCommand(withdrawAndCallCommand)
  .addCommand(stakingCommand)
  .helpCommand(false);
