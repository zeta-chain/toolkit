import chalk from "chalk";
import { Command, Option } from "commander";
import ora from "ora";
import { getBorderCharacters, table } from "table";
import { z } from "zod";

import { DEFAULT_API_URL } from "../../../../../src/constants/api";
import { tokensListOptionsSchema } from "../../../../../src/schemas/commands/tokens";
import {
  ForeignCoin,
  ForeignCoinsResponse,
} from "../../../../../types/foreignCoins.types";

type TokensListOptions = z.infer<typeof tokensListOptionsSchema>;

export const fetchForeignCoins = async (
  apiUrl: string
): Promise<ForeignCoin[]> => {
  const response = await fetch(`${apiUrl}/zeta-chain/fungible/foreign_coins`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = (await response.json()) as ForeignCoinsResponse;
  return data.foreignCoins;
};

const formatTokensTable = (
  tokens: ForeignCoin[],
  columns: ("asset" | "type" | "decimals")[]
): string[][] => {
  const headers = ["Chain ID", "Symbol", "ZRC-20"];

  if (columns.includes("asset")) headers.push("Asset");
  if (columns.includes("type")) headers.push("Type");
  if (columns.includes("decimals")) headers.push("Decimals");

  const rows = tokens.map((token) => {
    const baseRow = [
      token.foreign_chain_id,
      token.symbol,
      token.zrc20_contract_address,
    ];

    if (columns.includes("asset")) baseRow.push(token.asset || "-");
    if (columns.includes("type")) baseRow.push(token.coin_type);
    if (columns.includes("decimals")) baseRow.push(token.decimals.toString());

    return baseRow;
  });

  return [headers, ...rows];
};

const main = async (options: TokensListOptions) => {
  const spinner = options.json
    ? null
    : ora("Fetching ZRC-20 tokens...").start();

  try {
    const tokens = await fetchForeignCoins(options.api);
    if (!options.json) {
      spinner?.succeed(`Successfully fetched ${tokens.length} ZRC-20 tokens`);
    }

    const sortedTokens = tokens.sort(
      (a, b) => parseInt(a.foreign_chain_id) - parseInt(b.foreign_chain_id)
    );

    if (options.json) {
      console.log(JSON.stringify(sortedTokens, null, 2));
      return;
    }

    if (tokens.length === 0) {
      console.log(chalk.yellow("No ZRC-20 tokens found"));
      return;
    }

    const tableData = formatTokensTable(sortedTokens, options.columns);
    const tableOutput = table(tableData, {
      border: getBorderCharacters("norc"),
    });

    console.log(tableOutput);
  } catch (error) {
    if (!options.json) {
      spinner?.fail("Failed to fetch ZRC-20 tokens");
    }
    console.error(chalk.red("Error details:"), error);
  }
};

export const listCommand = new Command("list")
  .alias("l")
  .summary("List all ZRC-20 tokens")
  .description(
    "Fetches and displays a list of all registered ZRC-20 tokens on ZetaChain. You can customize output to include specific metadata columns or show results in JSON format."
  )
  .addOption(
    new Option("--api <url>", "API endpoint URL").default(DEFAULT_API_URL)
  )
  .option("--json", "Output in JSON format")
  .addOption(
    new Option("--columns <values...>", "Additional columns to display")
      .choices(["asset", "type", "decimals"])
      .default([])
  )
  .action(async (options: TokensListOptions) => {
    const validatedOptions = tokensListOptionsSchema.parse(options);
    await main(validatedOptions);
  });
