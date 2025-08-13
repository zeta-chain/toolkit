import chalk from "chalk";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import ora from "ora";
import { getBorderCharacters, table } from "table";

import {
  DEFAULT_API_URL,
  DEFAULT_EVM_RPC_URL,
} from "../../../../src/constants/api";
import { getFees } from "../../../../src/query/fees";
import {
  feesCLIOptionsSchema,
  feesParamsSchema,
} from "../../../../src/schemas/commands/fees";
import { FeesCLIOptions, FeesParams } from "../../../../src/types/fees";

const main = async (params: FeesParams, options: FeesCLIOptions) => {
  const spinner = options.json
    ? null
    : ora("Fetching foreign coins...").start();

  try {
    const feesData = await getFees(params, options);

    if (!options.json) {
      spinner?.succeed(
        `Successfully queried withdrawGasFee for ${feesData.length} ZRC-20 tokens`
      );
    }

    if (options.json) {
      console.log(JSON.stringify(feesData, null, 2));
      return;
    }

    const title = params.gasLimit
      ? `\nWithdraw and Call Gas Fees (with gas limit: ${params.gasLimit})`
      : "\nWithdraw Gas Fees";

    console.log(chalk.blue(title));

    const tableData = [
      ["Chain ID", "ZRC-20", "Fee Amount", "Fee Token"],
      ...feesData.map((result) => [
        result.chain_id,
        result.symbol,
        ethers.formatUnits(result.gasFeeAmount, result.gasFeeDecimals),
        result.gasTokenSymbol,
      ]),
    ];

    const tableConfig = {
      border: getBorderCharacters("norc"),
      columnDefault: {
        alignment: "left" as const,
      },
      columns: [
        { alignment: "left" as const },
        { alignment: "left" as const },
        { alignment: "right" as const },
        { alignment: "left" as const },
      ],
    };

    console.log(table(tableData, tableConfig));
  } catch (error) {
    if (!options.json) {
      spinner?.fail("Failed to fetch data");
    }
    console.log(
      chalk.yellow(
        error instanceof Error ? error.message : "Unknown error occurred"
      )
    );
  }
};

export const feesCommand = new Command("fees")
  .summary("Get cross-chain fees.")
  .description("Get estimated fees for cross-chain transactions.")
  .addOption(
    new Option("--api <url>", "API endpoint URL").default(DEFAULT_API_URL)
  )
  .addOption(
    new Option("--rpc <url>", "RPC endpoint URL").default(DEFAULT_EVM_RPC_URL)
  )
  .addOption(
    new Option(
      "--gas-limit <limit>",
      "Gas limit for withdraw and call transactions"
    )
  )
  .addOption(new Option("--json", "Output in JSON format"))
  .action(async (options) => {
    const params = feesParamsSchema.parse(options);
    const validatedOptions = feesCLIOptionsSchema.parse(options);
    await main(params, validatedOptions);
  });
