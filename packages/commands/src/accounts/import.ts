import { Command, Option } from "commander";
import { z } from "zod";

import {
  accountNameSchema,
  accountTypeSchema,
  AvailableAccountTypes,
} from "../../../../types/accounts.types";
import { DEFAULT_ACCOUNT_NAME } from "../../../../types/shared.constants";
import { privateKeyOrMnemonicRefineRule } from "../../../../types/shared.schema";
import { createAccountForType } from "../../../../utils/accounts";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";

const importAccountOptionsSchema = z
  .object({
    mnemonic: z.string().optional(),
    name: accountNameSchema,
    privateKey: z.string().optional(),
    type: accountTypeSchema,
  })
  .refine(privateKeyOrMnemonicRefineRule.rule, {
    message: privateKeyOrMnemonicRefineRule.message,
    path: privateKeyOrMnemonicRefineRule.path,
  });

type ImportAccountOptions = z.infer<typeof importAccountOptionsSchema>;

const main = async (options: ImportAccountOptions) => {
  const { type, name, privateKey, mnemonic } = options;
  await createAccountForType(type, name, privateKey, mnemonic);
};

export const importAccountsCommand = new Command("import")
  .description("Import an existing account using a private key")
  .addOption(
    new Option("--type <type>", "Account type").choices(AvailableAccountTypes)
  )
  .option("--name <name>", "Account name", DEFAULT_ACCOUNT_NAME)
  .option("--private-key <key>", "Private key in hex format")
  .option("--mnemonic <phrase>", "Mnemonic phrase")
  .action(async (opts) => {
    const validated = validateAndParseSchema(opts, importAccountOptionsSchema, {
      exitOnError: true,
    });
    await main(validated);
  });
