import { Command } from "commander";

import { callCommand } from "./call";

export const zetachainCommand = new Command("zetachain")
  .description("ZetaChain commands")
  .alias("z")
  .addCommand(callCommand)
  .helpCommand(false);
