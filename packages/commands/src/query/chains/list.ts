import { ForeignCoinsSDKType } from "@zetachain/sdk-cosmos/zetachain/zetacore/fungible/foreign_coins";
import { QueryAllForeignCoinsResponseSDKType } from "@zetachain/sdk-cosmos/zetachain/zetacore/fungible/query";
import chalk from "chalk";
import { Command, Option } from "commander";
import ora from "ora";
import { getBorderCharacters, table } from "table";
import { z } from "zod";

import { DEFAULT_API_URL } from "../../../../../src/constants/api";
import { chainsListOptionsSchema } from "../../../../../src/schemas/commands/chains";
import {
  ChainConfirmationMap,
  ChainData,
  ChainParams,
  ChainTokenMap,
} from "../../../../../types/chains.types";
import {
  ObserverSupportedChain,
  ObserverSupportedChainsResponse,
} from "../../../../../types/supportedChains.types";
import { fetchFromApi } from "../../../../../utils/api";

const TABLE_CONFIG = {
  border: getBorderCharacters("norc"),
  columns: {
    3: {
      // Tokens column
      width: 32,
      wrapWord: true,
    },
  },
} as const;

export const fetchAllChainData = async (api: string): Promise<ChainData> => {
  const [chainsData, tokensData, chainParamsData] = await Promise.all([
    fetchFromApi<ObserverSupportedChainsResponse>(
      api,
      "/zeta-chain/observer/supportedChains"
    ),
    fetchFromApi<QueryAllForeignCoinsResponseSDKType>(
      api,
      "/zeta-chain/fungible/foreign_coins"
    ),
    fetchFromApi<{
      chain_params: {
        chain_params: { chain_id: string; confirmation_count: string }[];
      };
    }>(api, "/zeta-chain/observer/get_chain_params"),
  ]);
  return {
    chainParams: chainParamsData.chain_params.chain_params,
    chains: chainsData.chains,
    tokens: tokensData.foreignCoins,
  };
};

const formatChainsTable = (
  chains: ObserverSupportedChain[],
  tokens: ForeignCoinsSDKType[],
  chainParams: ChainParams[]
): string[][] => {
  const headers = ["Chain ID", "Chain Name", "Count", "Tokens"];

  // Group tokens by foreign_chain_id
  const tokensByChain: ChainTokenMap = tokens.reduce((acc, token) => {
    const foreign_chain_id = String(token.foreign_chain_id);
    if (!acc[foreign_chain_id]) {
      acc[foreign_chain_id] = [];
    }
    acc[foreign_chain_id].push(token.symbol);
    return acc;
  }, {} as ChainTokenMap);

  // Map chain_id to confirmation_count
  const confirmationByChain: ChainConfirmationMap = chainParams.reduce(
    (acc, param) => {
      acc[param.chain_id] = param.confirmation_count;
      return acc;
    },
    {} as ChainConfirmationMap
  );

  const rows = chains.map((chain) => [
    chain.chain_id,
    chain.name,
    confirmationByChain[chain.chain_id] || "-",
    (tokensByChain[chain.chain_id] || []).join(", ") || "-",
  ]);

  return [headers, ...rows];
};

type ChainsListOptions = z.infer<typeof chainsListOptionsSchema>;

const main = async (options: ChainsListOptions) => {
  const spinner = options.json
    ? null
    : ora("Fetching supported chains, tokens, and chain params...").start();

  try {
    const { chains, tokens, chainParams } = await fetchAllChainData(
      options.api
    );

    if (!options.json) {
      spinner?.succeed(
        `Successfully fetched ${chains.length} supported chains, ${tokens.length} tokens, and ${chainParams.length} chain params`
      );
    }

    if (options.json) {
      // Output all for full context
      console.log(JSON.stringify({ chainParams, chains, tokens }, null, 2));
      return;
    }

    if (chains.length === 0) {
      console.log(chalk.yellow("No supported chains found"));
      return;
    }

    const tableData = formatChainsTable(chains, tokens, chainParams);
    const tableOutput = table(tableData, TABLE_CONFIG);

    console.log(tableOutput);
    console.log(`Note: Count refers to the number of confirmations required for a transaction
from that connected chain to be observed`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    if (!options.json) {
      spinner?.fail(`Failed to fetch chain data: ${errorMessage}`);
    }
    console.error(chalk.red("Error details:"), errorMessage);
  }
};

export const listCommand = new Command("list")
  .alias("l")
  .description("List all supported chains")
  .addOption(
    new Option("--api <url>", "API endpoint URL").default(DEFAULT_API_URL)
  )
  .option("--json", "Output chains as JSON")
  .action(async (options: ChainsListOptions) => {
    const validatedOptions = chainsListOptionsSchema.parse(options);
    await main(validatedOptions);
  });
