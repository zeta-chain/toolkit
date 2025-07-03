import chalk from "chalk";
import { Command, Option } from "commander";
import ora from "ora";
import { getBorderCharacters, table } from "table";
import { z } from "zod";

import {
  ForeignCoin,
  ForeignCoinsResponse,
} from "../../../../../types/foreignCoins.types";

const DEFAULT_API_URL =
  "https://zetachain-athens.blockpi.network/lcd/v1/public";

const showOptionsSchema = z.object({
  api: z.string().default(DEFAULT_API_URL),
  field: z.string().optional(),
  json: z.boolean().default(false),
  symbol: z.string(),
});

type ShowOptions = z.infer<typeof showOptionsSchema>;

const fetchForeignCoins = async (apiUrl: string): Promise<ForeignCoin[]> => {
  const response = await fetch(`${apiUrl}/zeta-chain/fungible/foreign_coins`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = (await response.json()) as ForeignCoinsResponse;
  return data.foreignCoins;
};

const findTokenBySymbol = (
  tokens: ForeignCoin[],
  symbol: string
): ForeignCoin | null => {
  return (
    tokens.find(
      (token) => token.symbol.toLowerCase() === symbol.toLowerCase()
    ) || null
  );
};

const formatTokenDetails = (token: ForeignCoin): string[][] => {
  return [
    ["Property", "Value"],
    ["Symbol", token.symbol],
    ["Name", token.name],
    ["Chain ID", token.foreign_chain_id],
    ["ZRC-20 Contract", token.zrc20_contract_address],
    ["Asset Contract", token.asset || "N/A (Gas token)"],
    ["Type", token.coin_type],
    ["Decimals", token.decimals.toString()],
    ["Gas Limit", token.gas_limit],
    ["Paused", token.paused ? "Yes" : "No"],
    ["Liquidity Cap", token.liquidity_cap],
  ];
};

const getFieldValue = (token: ForeignCoin, field: string): string => {
  // Handle shorthand for zrc20_contract_address
  if (field === "zrc20") {
    const value = token.zrc20_contract_address;
    if (!value || value.trim() === "") {
      throw new Error(
        `Field 'zrc20_contract_address' is empty for token '${token.symbol}'`
      );
    }
    return value;
  }

  // Check if the field exists on the token
  if (field in token) {
    const value = token[field as keyof ForeignCoin];
    const stringValue = String(value);

    // Check for empty values (empty string, null, undefined, "null", "undefined", "N/A")
    if (
      !stringValue ||
      stringValue.trim() === "" ||
      stringValue === "null" ||
      stringValue === "undefined" ||
      stringValue === "N/A"
    ) {
      throw new Error(`Field '${field}' is empty for token '${token.symbol}'`);
    }

    return stringValue;
  }

  throw new Error(
    `Invalid field: ${field}. Available fields: ${Object.keys(token).join(
      ", "
    )}, zrc20`
  );
};

const main = async (options: ShowOptions) => {
  const spinner =
    options.json || options.field
      ? null
      : ora("Fetching ZRC-20 tokens...").start();

  try {
    const tokens = await fetchForeignCoins(options.api);
    if (!options.json && !options.field) {
      spinner?.succeed(`Successfully fetched ${tokens.length} ZRC-20 tokens`);
    }

    const token = findTokenBySymbol(tokens, options.symbol);

    if (!token) {
      if (options.field) {
        console.error(
          chalk.red(`Token with symbol '${options.symbol}' not found`)
        );
        console.log(chalk.yellow("Available tokens:"));
        const availableSymbols = tokens.map((t) => t.symbol).sort();
        console.log(availableSymbols.join(", "));
        process.exit(1);
      } else if (!options.json) {
        spinner?.fail(`Token with symbol '${options.symbol}' not found`);
        console.log(chalk.yellow("Available tokens:"));
        const availableSymbols = tokens.map((t) => t.symbol).sort();
        console.log(availableSymbols.join(", "));
      }
      return;
    }

    // Handle field option - return single value for scripting
    if (options.field) {
      try {
        const value = getFieldValue(token, options.field);
        console.log(value);
        return;
      } catch (error) {
        if (error instanceof Error) {
          console.error(chalk.red(error.message));
        }
        return;
      }
    }

    if (options.json) {
      console.log(JSON.stringify(token, null, 2));
      return;
    }

    const tableData = formatTokenDetails(token);
    const tableOutput = table(tableData, {
      border: getBorderCharacters("norc"),
    });

    console.log(tableOutput);
  } catch (error) {
    if (!options.json && !options.field) {
      spinner?.fail("Failed to fetch ZRC-20 tokens");
      console.error(chalk.red("Error details:"), error);
    }
  }
};

export const showCommand = new Command("show")
  .alias("s")
  .description("Show detailed information for a specific ZRC-20 token")
  .addOption(
    new Option("--api <url>", "API endpoint URL").default(DEFAULT_API_URL)
  )
  .addOption(
    new Option(
      "--symbol -s <symbol>",
      "Token symbol (e.g., POL.AMOY, USDC.BSC)"
    ).makeOptionMandatory()
  )
  .addOption(
    new Option(
      "--field -f <field>",
      "Return specific field value (for scripting). Use 'zrc20' as shorthand for 'zrc20_contract_address'"
    )
  )
  .option("--json", "Output token as JSON")
  .action(async (options: ShowOptions) => {
    const validatedOptions = showOptionsSchema.parse(options);
    await main(validatedOptions);
  });
