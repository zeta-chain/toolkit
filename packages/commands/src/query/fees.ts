import ZRC20ABI from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import axios from "axios";
import chalk from "chalk";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import ora from "ora";
import { z } from "zod";

import { Call } from "../../../../types/balances.types";
import { ForeignCoinsResponse } from "../../../../types/foreignCoins.types";
import MULTICALL3_ABI from "../../../../utils/multicall3.json";

const DEFAULT_API_URL =
  "https://zetachain-athens.blockpi.network/lcd/v1/public";
const DEFAULT_RPC_URL =
  "https://zetachain-athens-evm.blockpi.network/v1/rpc/public";
const MULTICALL_ADDRESS = "0xca11bde05977b3631167028862be2a173976ca11";

const feesOptionsSchema = z.object({
  api: z.string().default(DEFAULT_API_URL),
  rpc: z.string().default(DEFAULT_RPC_URL),
});

type FeesOptions = z.infer<typeof feesOptionsSchema>;

interface WithdrawGasFeeResult {
  chain_id: string;
  gasFee: string;
  gasTokenAddress: string;
  gasTokenSymbol: string;
  symbol: string;
  zrc20Address: string;
}

const main = async (options: FeesOptions) => {
  const spinner = ora("Fetching foreign coins...").start();

  try {
    const response = await axios.get<ForeignCoinsResponse>(
      `${options.api}/zeta-chain/fungible/foreign_coins`
    );

    spinner.succeed(
      `Successfully fetched ${response.data.foreignCoins.length} foreign coins`
    );

    if (response.data.foreignCoins.length === 0) {
      console.log(chalk.yellow("No foreign coins found"));
      return;
    }

    const zrc20Contracts = response.data.foreignCoins.filter(
      (coin) =>
        coin.zrc20_contract_address && coin.zrc20_contract_address !== ""
    );

    if (zrc20Contracts.length === 0) {
      console.log(chalk.yellow("No ZRC20 contracts found"));
      return;
    }

    spinner.text = "Querying withdrawGasFee for ZRC20 contracts...";

    const multicallContexts: Call[] = zrc20Contracts.map((contract) => {
      const zrc20Interface = new ethers.Interface(ZRC20ABI.abi);
      const callData = zrc20Interface.encodeFunctionData("withdrawGasFee");

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
          "withdrawGasFee",
          returnData[i] as ethers.BytesLike
        );
        const [gasTokenAddress, gasFee] = decoded;

        const contract = zrc20Contracts[i];

        const gasToken = response.data.foreignCoins.find(
          (coin) =>
            coin.zrc20_contract_address.toLowerCase() ===
            (gasTokenAddress as string).toLowerCase()
        );

        results.push({
          chain_id: contract.foreign_chain_id,
          gasFee: ethers.formatUnits(gasFee as bigint, contract.decimals),
          gasTokenAddress: gasTokenAddress as string,
          gasTokenSymbol: gasToken?.symbol || "Unknown",
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

    spinner.succeed(
      `Successfully queried withdrawGasFee for ${results.length} ZRC20 contracts`
    );

    console.log(chalk.blue("\nWithdraw Gas Fees:"));
    console.table(
      results.map((result) => ({
        chain_id: result.chain_id,
        fee: `${result.gasFee} ${result.gasTokenSymbol}`,
        zrc20: result.symbol,
      }))
    );
  } catch (error) {
    spinner.fail("Failed to fetch data");
    console.error(chalk.red("Error details:"), error);
  }
};

export const feesCommand = new Command("fees")
  .description("Fetch omnichain and cross-chain messaging fees")
  .addOption(
    new Option("--api <url>", "API endpoint URL").default(DEFAULT_API_URL)
  )
  .addOption(
    new Option("--rpc <url>", "RPC endpoint URL").default(DEFAULT_RPC_URL)
  )
  .action(async (options: FeesOptions) => {
    const validatedOptions = feesOptionsSchema.parse(options);
    await main(validatedOptions);
  });
