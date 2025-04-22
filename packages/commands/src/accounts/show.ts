import { Command } from "commander";
import { z } from "zod";

import {
  AccountData,
  AvailableAccountTypes,
  accountDataSchema,
} from "../../../../types/accounts.types";
import { safeReadFile } from "../../../../utils/fsUtils";
import { handleError } from "../../../../utils/handleError";
import { getAccountKeyPath } from "../../../../utils/keyPaths";
import { parseJson } from "../../../../utils/parseJson";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";

const showAccountOptionsSchema = z.object({
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

export const showAccountCommand = new Command("show")
  .description("Show account details")
  .requiredOption("--name <name>", "Account name")
  .requiredOption("--type <type>", "Account type")
  .action((opts) => {
    const validated = validateAndParseSchema(opts, showAccountOptionsSchema, {
      exitOnError: true,
    });
    main(validated);
  });
