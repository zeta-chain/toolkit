import { Command, Option } from "commander";
import { z } from "zod";

import {
  accountNameSchema,
  accountTypeSchema,
  AvailableAccountTypes,
} from "../../../../types/accounts.types";
import { DEFAULT_ACCOUNT_NAME } from "../../../../types/shared.constants";
import { createAccountForType } from "../../../../utils/accounts";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";
const createAccountOptionsSchema = z.object({
  name: accountNameSchema,
  type: accountTypeSchema.optional(),
});

type CreateAccountOptions = z.infer<typeof createAccountOptionsSchema>;

const main = async (options: CreateAccountOptions) => {
  const { type, name } = options;

  if (type) {
    await createAccountForType(type, name);
  } else {
    console.log("Creating accounts for all supported types...");
    for (const accountType of AvailableAccountTypes) {
      await createAccountForType(accountType, name);
    }
  }
};

export const createAccountsCommand = new Command("create")
  .summary("Create a new account")
  .description(
    `Generates a new account for the specified chain type.

You can name the account for easier identification; if no name is provided, it defaults to default.`
  )
  .addOption(
    new Option("--type <type>", "Chain type").choices(AvailableAccountTypes)
  )
  .option("--name <name>", "Account name", DEFAULT_ACCOUNT_NAME)
  .action(async (opts) => {
    const validated = validateAndParseSchema(opts, createAccountOptionsSchema, {
      exitOnError: true,
    });
    await main(validated);
  });
