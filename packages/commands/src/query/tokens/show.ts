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

const showOptionsSchema = z.object({
  api: z.string().default(DEFAULT_API_URL),
  json: z.boolean().default(false),
  symbol: z.string(),
});

type ShowOptions = z.infer<typeof showOptionsSchema>;

const fetchForeignCoins = async (apiUrl: string): Promise<ForeignCoin[]> => {
  const response = await fetch(`${apiUrl}/zeta-chain/fungible/foreign_coins`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: ForeignCoinsResponse = await response.json();
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

const main = async (options: ShowOptions) => {
  const spinner = ora("Fetching ZRC-20 tokens...").start();

  try {
    const tokens = await fetchForeignCoins(options.api);
    spinner.succeed(`Successfully fetched ${tokens.length} ZRC-20 tokens`);

    const token = findTokenBySymbol(tokens, options.symbol);

    if (!token) {
      spinner.fail(`Token with symbol '${options.symbol}' not found`);
      console.log(chalk.yellow("Available tokens:"));
      const availableSymbols = tokens.map((t) => t.symbol).sort();
      console.log(availableSymbols.join(", "));
      return;
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
    spinner.fail("Failed to fetch ZRC-20 tokens");
    console.error(chalk.red("Error details:"), error);
  }
};

export const showCommand = new Command("show")
  .description("Show detailed information for a specific ZRC-20 token")
  .addOption(
    new Option("--api <url>", "API endpoint URL").default(DEFAULT_API_URL)
  )
  .addOption(
    new Option(
      "--symbol <symbol>",
      "Token symbol (e.g., POL.AMOY, USDC.BSC)"
    ).makeOptionMandatory()
  )
  .option("--json", "Output token as JSON")
  .action(async (options: ShowOptions) => {
    const validatedOptions = showOptionsSchema.parse(options);
    await main(validatedOptions);
  });
