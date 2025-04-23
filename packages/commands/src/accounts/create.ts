import { Command, Option } from "commander";
import { z } from "zod";

import {
  accountNameSchema,
  AvailableAccountTypes,
} from "../../../../types/accounts.types";
import { createAccountForType } from "../../../../utils/accounts";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";

const createAccountOptionsSchema = z.object({
  name: accountNameSchema,
  type: z
    .enum(AvailableAccountTypes, {
      errorMap: () => ({
        message: "Type must be either 'evm', 'solana', or 'bitcoin'",
      }),
    })
    .optional(),
});

type CreateAccountOptions = z.infer<typeof createAccountOptionsSchema>;

const main = async (options: CreateAccountOptions) => {
  const { type, name } = options;

  if (type) {
    await createAccountForType(type, name);
  } else {
    console.log("Creating accounts for all supported types...");
    await createAccountForType("evm", name);
    await createAccountForType("solana", name);
    await createAccountForType("bitcoin", name);
  }
};

export const createAccountsCommand = new Command("create")
  .description("Create a new account")
  .addOption(
    new Option(
      "--type <type>",
      "Account type (evm, solana, or bitcoin)"
    ).choices(AvailableAccountTypes)
  )
  .requiredOption("--name <name>", "Account name")
  .action(async (opts) => {
    const validated = validateAndParseSchema(opts, createAccountOptionsSchema, {
      exitOnError: true,
    });
    await main(validated);
  });
