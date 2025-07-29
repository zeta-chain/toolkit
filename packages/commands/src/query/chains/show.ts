import chalk from "chalk";
import { Command, Option } from "commander";
import ora from "ora";
import { getBorderCharacters, table } from "table";
import { Chain } from "viem";
import * as viemChains from "viem/chains";
import { z } from "zod";

import {
  DEFAULT_API_MAINNET_URL,
  DEFAULT_API_TESTNET_URL,
} from "../../../../../src/constants/api";
import { chainsShowOptionsSchema } from "../../../../../src/schemas/commands/chains";
import { ObserverSupportedChain } from "../../../../../types/supportedChains.types";
import { getAPIbyChainId } from "../../../../../utils/solana.commands.helpers";
import { getSuiRpcByChainId } from "../../../../../utils/sui";
import { fetchAllChainData } from "./list";

type ChainsShowOptions = z.infer<typeof chainsShowOptionsSchema>;

const toFieldName = (str: string): string => {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "_");
};

// Helper function to get field value from chain or derived data
const getFieldValue = (
  chain: ObserverSupportedChain,
  field: string,
  tokens: string[],
  confirmations: string | undefined,
  viemChain: Chain | undefined
): string => {
  // Handle special derived fields
  if (field === "tokens") {
    return tokens.join(", ");
  }
  if (field === "confirmations") {
    return confirmations || "";
  }
  if (field === "rpc") {
    if (chain.chain_id === "900" || chain.chain_id === "901") {
      return getAPIbyChainId(chain.chain_id);
    }

    if (chain.chain_id === "101" || chain.chain_id === "103") {
      return getSuiRpcByChainId(chain.chain_id);
    }
    return viemChain?.rpcUrls?.default?.http?.[0] || "";
  }
  if (field === "explorer") {
    return viemChain?.blockExplorers?.default?.url || "";
  }

  // Handle chain properties
  if (field in chain) {
    const value = chain[field as keyof ObserverSupportedChain];
    const stringValue = String(value);
    if (
      !stringValue ||
      stringValue.trim() === "" ||
      stringValue === "null" ||
      stringValue === "undefined" ||
      stringValue === "N/A"
    ) {
      throw new Error(`Field '${field}' is empty for chain '${chain.name}'`);
    }
    return stringValue;
  }

  // Try to match field name using the conversion function
  const chainKeys = Object.keys(chain);
  const matchingKey = chainKeys.find((key) => toFieldName(key) === field);

  if (matchingKey) {
    const value = chain[matchingKey as keyof ObserverSupportedChain];
    const stringValue = String(value);
    if (
      !stringValue ||
      stringValue.trim() === "" ||
      stringValue === "null" ||
      stringValue === "undefined" ||
      stringValue === "N/A"
    ) {
      throw new Error(`Field '${field}' is empty for chain '${chain.name}'`);
    }
    return stringValue;
  }

  throw new Error(
    `Invalid field: ${field}. Available fields: ${[
      ...chainKeys.map((k) => toFieldName(k)),
      "tokens",
      "confirmations",
      "rpc",
      "explorer",
    ].join(", ")}`
  );
};

const formatChainDetails = (
  chain: ObserverSupportedChain,
  tokens: string[],
  confirmations: string | undefined,
  viemChain: Chain | undefined
): string[][] => {
  const baseDetails = [
    ["Property", "Value"],
    ["Chain ID", chain.chain_id],
    ["Name", chain.name],
    ["Network", chain.network],
    ["Network Type", chain.network_type],
    ["VM", chain.vm],
    ["Consensus", chain.consensus],
    ["External", chain.is_external ? "Yes" : "No"],
    ["Gateway", chain.cctx_gateway],
    ["Confirmations", confirmations || "-"],
    ["Tokens", tokens.length ? tokens.join(", ") : "-"],
  ];

  // Add viem chain information if available
  if (viemChain) {
    let rpcUrl = viemChain.rpcUrls?.default?.http?.[0] || "-";
    // Check if this is a Solana chain and use getAPIbyChainId
    if (chain.chain_id === "900" || chain.chain_id === "901") {
      rpcUrl = getAPIbyChainId(chain.chain_id);
    }
    // Check if this is a Sui chain and use getSuiRpcByChainId
    if (
      chain.chain_id === "101" ||
      chain.chain_id === "103" ||
      chain.chain_id === "104"
    ) {
      rpcUrl = getSuiRpcByChainId(chain.chain_id);
    }

    baseDetails.push(
      ["RPC URL", rpcUrl],
      ["Explorer", viemChain.blockExplorers?.default?.url || "-"]
    );
  }

  return baseDetails;
};

const main = async (options: ChainsShowOptions) => {
  const spinner =
    options.json || options.field
      ? null
      : ora("Fetching supported chains, tokens, and chain params...").start();

  try {
    const [testnetData, mainnetData] = await Promise.all([
      fetchAllChainData(options.apiTestnet),
      fetchAllChainData(options.apiMainnet),
    ]);

    const chains = [...testnetData.chains, ...mainnetData.chains];
    const allTokens = [...testnetData.tokens, ...mainnetData.tokens];
    const chainParams = [
      ...testnetData.chainParams,
      ...mainnetData.chainParams,
    ];

    if (!options.json && !options.field) {
      spinner?.succeed(
        `Successfully fetched ${chains.length} supported chains, ${allTokens.length} tokens, and ${chainParams.length} chain params (testnet + mainnet)`
      );
    }

    let searchValue: string;
    let searchByChainId = false;

    if (options.chainId) {
      searchValue = options.chainId;
      searchByChainId = true;
    } else if (options.chainName) {
      searchValue = options.chainName;
      searchByChainId = false;
    } else {
      throw new Error("Either --chain-name or --chain-id must be provided");
    }

    // Find chain by the appropriate criteria
    const chain = chains.find((c) => {
      if (searchByChainId) {
        return c.chain_id === searchValue;
      } else {
        return c.name.toLowerCase() === searchValue.toLowerCase();
      }
    });

    if (!chain) {
      if (options.field) {
        console.error(chalk.red(`Chain '${searchValue}' not found`));
        console.log(chalk.yellow("Available chains:"));
        const available = chains
          .map((c: ObserverSupportedChain) => `${c.name} (ID: ${c.chain_id})`)
          .sort();
        console.log(available.join(", "));
        process.exit(1);
      } else if (!options.json) {
        spinner?.fail(`Chain '${searchValue}' not found`);
        console.log(chalk.yellow("Available chains:"));
        const available = chains
          .map((c: ObserverSupportedChain) => `${c.name} (ID: ${c.chain_id})`)
          .sort();
        console.log(available.join(", "));
      }
      return;
    }

    const tokens = allTokens
      .filter(
        (t: { foreign_chain_id: string }) =>
          t.foreign_chain_id === chain.chain_id
      )
      .map((t: { symbol: string }) => t.symbol);
    const confirmations = chainParams.find(
      (p: { chain_id: string }) => p.chain_id === chain.chain_id
    )?.confirmation_count;

    const numericChainId = parseInt(chain.chain_id);
    const viemChain = Object.values(viemChains).find(
      (chain: Chain) => chain.id === numericChainId
    );

    if (options.field) {
      try {
        const value = getFieldValue(
          chain,
          options.field,
          tokens,
          confirmations,
          viemChain
        );
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
      console.log(JSON.stringify({ ...chain, confirmations, tokens }, null, 2));
      return;
    }

    const tableData = formatChainDetails(
      chain,
      tokens,
      confirmations,
      viemChain
    );
    const tableOutput = table(tableData, {
      border: getBorderCharacters("norc"),
      columns: {
        10: {
          width: 32,
          wrapWord: true,
        },
      },
    });

    console.log(tableOutput);
  } catch (error) {
    if (!options.json && !options.field) {
      spinner?.fail(
        "Failed to fetch supported chains, tokens, or chain params"
      );
      console.error(chalk.red("Error details:"), error);
    }
  }
};

export const showCommand = new Command("show")
  .alias("s")
  .description(
    "Show detailed information for a specific chain (by chain name or chain ID)"
  )
  .addOption(
    new Option("--api-testnet <url>", "Testnet API endpoint URL").default(
      DEFAULT_API_TESTNET_URL
    )
  )
  .addOption(
    new Option("--api-mainnet <url>", "Mainnet API endpoint URL").default(
      DEFAULT_API_MAINNET_URL
    )
  )
  .addOption(
    new Option("--chain-name  <chain>", "Chain name").conflicts(["chain-id"])
  )
  .addOption(
    new Option("-c, --chain-id <chain-id>", "Chain ID").conflicts(["chain"])
  )
  .addOption(
    new Option(
      "--field -f <field>",
      "Return specific field value (for scripting)"
    )
  )
  .option("--json", "Output chain as JSON")
  .action(async (options: ChainsShowOptions) => {
    const validatedOptions = chainsShowOptionsSchema.parse(options);
    await main(validatedOptions);
  });
