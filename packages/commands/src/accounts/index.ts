import { Command } from "commander";

import { createAccountsCommand } from "./create";
import { deleteAccountsCommand } from "./delete";
import { importAccountsCommand } from "./import";
import { listAccountsCommand } from "./list";
import { showAccountsCommand } from "./show";

export const accountsCommand = new Command("accounts")
  .description("Account management commands")
  .addCommand(createAccountsCommand)
  .addCommand(showAccountsCommand)
  .addCommand(listAccountsCommand)
  .addCommand(deleteAccountsCommand)
  .addCommand(importAccountsCommand)
  .helpCommand(false);
