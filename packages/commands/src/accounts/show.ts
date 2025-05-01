import { Command, Option } from "commander";
import { z } from "zod";

import {
  accountDataSchema,
  AvailableAccountTypes,
} from "../../../../types/accounts.types";
import { safeExists, safeReadFile } from "../../../../utils/fsUtils";
import { handleError } from "../../../../utils/handleError";
import { getAccountKeyPath } from "../../../../utils/keyPaths";
import { parseJson } from "../../../../utils/parseJson";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";

const showAccountOptionsSchema = z.object({
  json: z.boolean().default(false),
  name: z.string(),
  type: z.enum(AvailableAccountTypes),
});

type ShowAccountOptions = z.infer<typeof showAccountOptionsSchema>;

const main = (options: ShowAccountOptions): void => {
  const { name, type } = options;
  const keyPath = getAccountKeyPath(type, name);

  try {
    const keyData = safeReadFile(keyPath);
    const parsedData = parseJson(keyData, accountDataSchema);
    console.log(JSON.stringify(parsedData, null, 2));
  } catch (error: unknown) {
    handleError({
      context: "Failed to read account data",
      error,
      shouldThrow: true,
    });
  }
};

export const showAccountsCommand = new Command("show")
  .description("Show details of an existing account")
  .addOption(
    new Option("--type <type>", "Account type").choices(AvailableAccountTypes)
  )
  .requiredOption("--name <name>", "Account name")
  .action((opts) => {
    const validated = validateAndParseSchema(opts, showAccountOptionsSchema, {
      exitOnError: true,
    });
    main(validated);
  });
