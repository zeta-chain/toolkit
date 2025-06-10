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

const importAccountOptionsSchema = z.object({
  name: accountNameSchema,
  privateKey: z.string().min(1, "Private key is required"),
  type: accountTypeSchema,
});

type ImportAccountOptions = z.infer<typeof importAccountOptionsSchema>;

const main = async (options: ImportAccountOptions) => {
  const { type, name, privateKey } = options;
  await createAccountForType(type, name, privateKey);
};

export const importAccountsCommand = new Command("import")
  .summary("Import an existing account using a private key")
  .addOption(
    new Option("--type <type>", "Account type").choices(AvailableAccountTypes)
  )
  .option("--name <name>", "Account name", DEFAULT_ACCOUNT_NAME)
  .requiredOption("--private-key <key>", "Private key in hex format")
  .action(async (opts) => {
    const validated = validateAndParseSchema(opts, importAccountOptionsSchema, {
      exitOnError: true,
    });
    await main(validated);
  });
