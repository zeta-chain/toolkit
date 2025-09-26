import { Command } from "commander";

import { callCommand } from "./call";
import { stakingCommand } from "./staking";
import { withdrawCommand } from "./withdraw";
import { withdrawAndCallCommand } from "./withdrawAndCall";

export const zetachainCommand = new Command("zetachain")
  .summary("ZetaChain commands")
  .alias("z")
  .addCommand(callCommand)
  .addCommand(withdrawCommand)
  .addCommand(withdrawAndCallCommand)
  .addCommand(stakingCommand)
  .helpCommand(false);
