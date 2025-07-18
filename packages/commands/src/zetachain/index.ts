import { Command } from "commander";

import { callCommand } from "./call";
import { poolsCommand } from "./pools";
import { withdrawCommand } from "./withdraw";
import { withdrawAndCallCommand } from "./withdrawAndCall";

export const zetachainCommand = new Command("zetachain")
  .summary("ZetaChain commands")
  .alias("z")
  .addCommand(callCommand)
  .addCommand(withdrawCommand)
  .addCommand(withdrawAndCallCommand)
  .addCommand(poolsCommand)
  .helpCommand(false);
