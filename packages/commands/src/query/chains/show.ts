import chalk from "chalk";
import { Command, Option } from "commander";
import ora from "ora";
import { getBorderCharacters, table } from "table";
import { z } from "zod";

import { DEFAULT_API_URL } from "../../../../../src/constants/api";
import { chainsShowOptionsSchema } from "../../../../../src/schemas/commands/chains";
import { ObserverSupportedChain } from "../../../../../types/supportedChains.types";
import { fetchAllChainData } from "./list";

type ChainsShowOptions = z.infer<typeof chainsShowOptionsSchema>;

const findChain = (
  chains: ObserverSupportedChain[],
  chain: string
): ObserverSupportedChain | null => {
  return (
    chains.find(
      (c) =>
        // Only match by name (case-insensitive)
        c.name.toLowerCase() === chain.toLowerCase()
    ) || null
  );
};

const formatChainDetails = (
  chain: ObserverSupportedChain,
  tokens: string[],
  confirmations: string | undefined
): string[][] => {
  return [
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
};

const getFieldValue = (
  chain: ObserverSupportedChain,
  field: string
): string => {
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
  throw new Error(
    `Invalid field: ${field}. Available fields: ${Object.keys(chain)
      .filter((k) => k !== "chain_name")
      .join(", ")}`
  );
};

const main = async (options: ChainsShowOptions) => {
  const spinner =
    options.json || options.field
      ? null
      : ora("Fetching supported chains, tokens, and chain params...").start();

  try {
    const {
      chains,
      tokens: allTokens,
      chainParams,
    } = await fetchAllChainData(options.api);
    if (!options.json && !options.field) {
      spinner?.succeed(
        `Successfully fetched ${chains.length} supported chains, ${allTokens.length} tokens, and ${chainParams.length} chain params`
      );
    }

    const chain = findChain(chains, options.chain);

    if (!chain) {
      if (options.field) {
        console.error(chalk.red(`Chain '${options.chain}' not found`));
        console.log(chalk.yellow("Available chains:"));
        const available = chains
          .map((c: ObserverSupportedChain) => c.name)
          .sort();
        console.log(available.join(", "));
        process.exit(1);
      } else if (!options.json) {
        spinner?.fail(`Chain '${options.chain}' not found`);
        console.log(chalk.yellow("Available chains:"));
        const available = chains
          .map((c: ObserverSupportedChain) => c.name)
          .sort();
        console.log(available.join(", "));
      }
      return;
    }

    // Find tokens for this chain
    const tokens = allTokens
      .filter(
        (t: { foreign_chain_id: string }) =>
          t.foreign_chain_id === chain.chain_id
      )
      .map((t: { symbol: string }) => t.symbol);
    // Find confirmations for this chain
    const confirmations = chainParams.find(
      (p: { chain_id: string }) => p.chain_id === chain.chain_id
    )?.confirmation_count;

    if (options.field) {
      try {
        if (options.field === "tokens") {
          console.log(tokens.join(", "));
          return;
        }
        if (options.field === "confirmations") {
          console.log(confirmations || "-");
          return;
        }
        const value = getFieldValue(chain, options.field);
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

    const tableData = formatChainDetails(chain, tokens, confirmations);
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
    "Show detailed information for a specific chain (by chain_id or chain_name)"
  )
  .addOption(
    new Option("--api <url>", "API endpoint URL").default(DEFAULT_API_URL)
  )
  .addOption(
    new Option(
      "--chain -c <chain>",
      "Chain Name (case-insensitive)"
    ).makeOptionMandatory()
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
