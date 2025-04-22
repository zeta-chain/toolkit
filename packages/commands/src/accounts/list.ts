import { Command } from "commander";
import path from "path";
import { z } from "zod";

import {
  AccountData,
  AvailableAccountTypes,
  accountDataSchema,
} from "../../../../types/accounts.types";
import {
  safeExists,
  safeReadDir,
  safeReadFile,
} from "../../../../utils/fsUtils";
import { handleError } from "../../../../utils/handleError";
import {
  getAccountKeyPath,
  getAccountTypeDir,
} from "../../../../utils/keyPaths";
import { parseJson } from "../../../../utils/parseJson";
import { validateAndParseSchema } from "../../../../utils/validateAndParseSchema";

const listAccountsOptionsSchema = z.object({
  json: z.boolean().optional(),
});

type ListAccountsOptions = z.infer<typeof listAccountsOptionsSchema>;

interface TableAccountData {
  Name: string;
  Address: string;
  Type: string;
}

const listChainAccounts = (
  chainType: (typeof AvailableAccountTypes)[number],
  accounts: AccountData[]
): void => {
  const chainDir = getAccountTypeDir(chainType);
  if (!safeExists(chainDir)) return;

  const files = safeReadDir(chainDir).filter((file) => file.endsWith(".json"));

  for (const file of files) {
    const keyPath = path.join(chainDir, file);
    try {
      const keyData = safeReadFile(keyPath);
      const parsedData = parseJson(keyData, accountDataSchema);
      if (parsedData.address && parsedData.privateKey) {
        accounts.push({
          ...parsedData,
          name: file.replace(".json", ""),
        });
      }
    } catch (error: unknown) {
      // Skip invalid files
      continue;
    }
  }
};

const main = (options: ListAccountsOptions): void => {
  const { json } = options;
  const accounts: AccountData[] = [];

  listChainAccounts("evm", accounts);
  listChainAccounts("solana", accounts);

  if (accounts.length === 0) {
    console.log("No accounts found.");
    return;
  }

  if (json) {
    console.log(JSON.stringify(accounts, null, 2));
  } else {
    console.log("\nAvailable Accounts:");
    const tableData: TableAccountData[] = accounts.map((account) => ({
      Name: account.name || "Unnamed",
      Address: account.address,
      Type: account.address.startsWith("0x") ? "EVM" : "SOLANA",
    }));
    console.table(tableData);
  }
};

export const listAccountsCommand = new Command("list")
  .description("List all available accounts")
  .option("--json", "Output in JSON format")
  .action((opts) => {
    const validated = validateAndParseSchema(opts, listAccountsOptionsSchema, {
      exitOnError: true,
    });
    main(validated);
  });
