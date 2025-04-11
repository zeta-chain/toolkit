import { Command } from "commander";

import { createAccountsCommand } from "./create";
import { listAccountsCommand } from "./list";
import { showAccountsCommand } from "./show";

export const accountsCommand = new Command("accounts")
  .description("Account management commands")
  .addCommand(createAccountsCommand)
  .addCommand(showAccountsCommand)
  .addCommand(listAccountsCommand);
