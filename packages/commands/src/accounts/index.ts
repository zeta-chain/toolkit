import { Command } from "commander";

import { createAccountsCommand } from "./create";
import { deleteAccountsCommand } from "./delete";
import { listAccountsCommand } from "./list";
import { showAccountCommand } from "./show";

export const accountsCommand = new Command("accounts")
  .description("Account management commands")
  .addCommand(createAccountsCommand)
  .addCommand(showAccountCommand)
  .addCommand(listAccountsCommand)
  .addCommand(deleteAccountsCommand);
