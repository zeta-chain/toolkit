import { Command } from "commander";

import { createAccountsCommand } from "./create";
import { deleteAccountsCommand } from "./delete";
import { importAccountsCommand } from "./import";
import { listAccountsCommand } from "./list";
import { showAccountsCommand } from "./show";

export const accountsCommand = new Command("accounts")
  .summary("Account management commands")
  .addCommand(createAccountsCommand)
  .addCommand(deleteAccountsCommand)
  .addCommand(importAccountsCommand)
  .addCommand(listAccountsCommand)
  .addCommand(showAccountsCommand)
  .helpCommand(false);
