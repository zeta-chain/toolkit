import ZRC20ABI from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import axios from "axios";
import chalk from "chalk";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import ora from "ora";
import { getBorderCharacters, table } from "table";
import { z } from "zod";

import { MULTICALL_ADDRESS } from "../../../../src/constants/addresses";
import {
  DEFAULT_API_URL,
  DEFAULT_EVM_RPC_URL,
} from "../../../../src/constants/api";
import { Call } from "../../../../types/balances.types";
import { ForeignCoinsResponse } from "../../../../types/foreignCoins.types";
import MULTICALL3_ABI from "../../../../utils/multicall3.json";

const feesParamsSchema = z.object({
  gasLimit: z.string().optional(),
});

const feesOptionsSchema = z.object({
  api: z.string().default(DEFAULT_API_URL),
  json: z.boolean().default(false),
  rpc: z.string().default(DEFAULT_EVM_RPC_URL),
});

type FeesParams = z.infer<typeof feesParamsSchema>;
type FeesOptions = z.infer<typeof feesOptionsSchema>;

interface WithdrawGasFeeResult {
  chain_id: string;
  gasFeeAmount: string;
  gasFeeDecimals: number;
  gasTokenAddress: string;
  gasTokenSymbol: string;
  symbol: string;
  zrc20Address: string;
}

export const getFees = async (
  params: FeesParams = {},
  options: FeesOptions = feesOptionsSchema.parse({})
): Promise<WithdrawGasFeeResult[]> => {
  try {
    const response = await axios.get<ForeignCoinsResponse>(
      `${options.api}/zeta-chain/fungible/foreign_coins`
    );

    if (response.data.foreignCoins.length === 0) {
      throw new Error("No foreign coins found");
    }

    const zrc20Contracts = response.data.foreignCoins.filter(
      (coin) =>
        coin.zrc20_contract_address && coin.zrc20_contract_address !== ""
    );

    if (zrc20Contracts.length === 0) {
      throw new Error("No ZRC20 contracts found");
    }

    const multicallContexts: Call[] = zrc20Contracts.map((contract) => {
      const zrc20Interface = new ethers.Interface(ZRC20ABI.abi);
      const callData = params.gasLimit
        ? zrc20Interface.encodeFunctionData("withdrawGasFeeWithGasLimit", [
            params.gasLimit,
          ])
        : zrc20Interface.encodeFunctionData("withdrawGasFee");

      return {
        callData,
        target: contract.zrc20_contract_address,
      };
    });

    const provider = new ethers.JsonRpcProvider(options.rpc);
    const multicallInterface = new ethers.Interface(MULTICALL3_ABI);
    const multicallContract = new ethers.Contract(
      MULTICALL_ADDRESS,
      multicallInterface,
      provider
    );

    const [, returnData] = (await multicallContract.aggregate.staticCall(
      multicallContexts
    )) as [bigint, string[]];

    const results: WithdrawGasFeeResult[] = [];
    const zrc20Interface = new ethers.Interface(ZRC20ABI.abi);

    for (let i = 0; i < returnData.length; i++) {
      try {
        const decoded = zrc20Interface.decodeFunctionResult(
          params.gasLimit ? "withdrawGasFeeWithGasLimit" : "withdrawGasFee",
          returnData[i] as ethers.BytesLike
        );
        const gasTokenAddress = decoded[0] as string;
        const gasFee = decoded[1] as bigint;

        const contract = zrc20Contracts[i];

        const gasToken = response.data.foreignCoins.find(
          (coin) =>
            coin.zrc20_contract_address.toLowerCase() ===
            gasTokenAddress.toLowerCase()
        );

        if (!gasToken) {
          console.error(
            `Gas token not found for address ${gasTokenAddress} in contract ${contract.symbol}`
          );
          continue;
        }

        results.push({
          chain_id: contract.foreign_chain_id,
          gasFeeAmount: gasFee.toString(),
          gasFeeDecimals: gasToken.decimals,
          gasTokenAddress,
          gasTokenSymbol: gasToken.symbol,
          symbol: contract.symbol,
          zrc20Address: contract.zrc20_contract_address,
        });
      } catch (error) {
        console.error(
          `Failed to decode withdrawGasFee for ${zrc20Contracts[i].symbol}:`,
          error
        );
      }
    }

    results.sort((a, b) => a.chain_id.localeCompare(b.chain_id));

    return results;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unknown error occurred"
    );
  }
};

const main = async (params: FeesParams, options: FeesOptions) => {
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
  .description("Fetch omnichain and cross-chain messaging fees")
  .addOption(
    new Option("--api <url>", "API endpoint URL").default(DEFAULT_API_URL)
  )
  .addOption(
    new Option("--rpc <url>", "RPC endpoint URL").default(DEFAULT_EVM_RPC_URL)
  )
  .addOption(
    new Option("--gas-limit <limit>", "Gas limit for withdraw and call")
  )
  .addOption(new Option("--json", "Output results in JSON format"))
  .action(async (options) => {
    const params = feesParamsSchema.parse(options);
    const validatedOptions = feesOptionsSchema.parse(options);
    await main(params, validatedOptions);
  });
