import chalk from "chalk";
import { Command, Option } from "commander";
import ora from "ora";
import { table, getBorderCharacters } from "table";
import { z } from "zod";
import {
  ForeignCoin,
  ForeignCoinsResponse,
} from "../../../../../types/foreignCoins.types";

const DEFAULT_API_URL =
  "https://zetachain-athens.blockpi.network/lcd/v1/public";

const tokensOptionsSchema = z.object({
  api: z.string().default(DEFAULT_API_URL),
  json: z.boolean().default(false),
  columns: z.array(z.enum(["asset", "type", "decimals"])).default([]),
});

type TokensOptions = z.infer<typeof tokensOptionsSchema>;

const fetchForeignCoins = async (apiUrl: string): Promise<ForeignCoin[]> => {
  const response = await fetch(`${apiUrl}/zeta-chain/fungible/foreign_coins`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: ForeignCoinsResponse = await response.json();
  return data.foreignCoins;
};

const formatTokensTable = (
  tokens: ForeignCoin[],
  columns: ("asset" | "type" | "decimals")[]
): string[][] => {
  const headers = ["Chain ID", "Symbol", "ZRC-20"];

  // Add selected columns to headers
  if (columns.includes("asset")) headers.push("Asset");
  if (columns.includes("type")) headers.push("Type");
  if (columns.includes("decimals")) headers.push("Decimals");

  const rows = tokens.map((token) => {
    const baseRow = [
      token.foreign_chain_id,
      token.symbol,
      token.zrc20_contract_address,
    ];

    // Add selected columns to rows
    if (columns.includes("asset")) baseRow.push(token.asset || "-");
    if (columns.includes("type")) baseRow.push(token.coin_type);
    if (columns.includes("decimals")) baseRow.push(token.decimals.toString());

    return baseRow;
  });

  return [headers, ...rows];
};

const main = async (options: TokensOptions) => {
  const spinner = ora("Fetching ZRC-20 tokens...").start();

  try {
    const tokens = await fetchForeignCoins(options.api);
    spinner.succeed(`Successfully fetched ${tokens.length} ZRC-20 tokens`);

    if (options.json) {
      console.log(JSON.stringify(tokens, null, 2));
      return;
    }

    if (tokens.length === 0) {
      console.log(chalk.yellow("No ZRC-20 tokens found"));
      return;
    }

    // Sort tokens by chain ID
    const sortedTokens = tokens.sort(
      (a, b) => parseInt(a.foreign_chain_id) - parseInt(b.foreign_chain_id)
    );

    const tableData = formatTokensTable(sortedTokens, options.columns);
    const tableOutput = table(tableData, {
      border: getBorderCharacters("norc"),
    });

    console.log(tableOutput);
  } catch (error) {
    spinner.fail("Failed to fetch ZRC-20 tokens");
    console.error(chalk.red("Error details:"), error);
  }
};

export const listCommand = new Command("list")
  .description("List all ZRC-20 tokens")
  .addOption(
    new Option("--api <url>", "API endpoint URL").default(DEFAULT_API_URL)
  )
  .option("--json", "Output tokens as JSON")
  .addOption(
    new Option("--columns <values...>", "Additional columns to show")
      .choices(["asset", "type", "decimals"])
      .default([])
  )
  .action(async (options: TokensOptions) => {
    const validatedOptions = tokensOptionsSchema.parse(options);
    await main(validatedOptions);
  });
