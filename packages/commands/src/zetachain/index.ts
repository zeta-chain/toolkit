import { Command } from "commander";

import { callCommand } from "./call";
import { withdrawCommand } from "./withdraw";
import { withdrawAndCallCommand } from "./withdrawAndCall";

export const zetachainCommand = new Command("zetachain")
  .description("ZetaChain commands")
  .alias("z")
  .addCommand(callCommand)
  .addCommand(withdrawCommand)
  .addCommand(withdrawAndCallCommand)
  .helpCommand(false);
