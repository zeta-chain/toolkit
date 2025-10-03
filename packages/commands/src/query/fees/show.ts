import UniswapV2RouterABI from "@uniswap/v2-periphery/build/IUniswapV2Router02.json";
import ZRC20ABI from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import type { IZRC20 } from "@zetachain/protocol-contracts/types/IZRC20.sol/IZRC20";
import type { IZRC20Metadata } from "@zetachain/protocol-contracts/types/IZRC20.sol/IZRC20Metadata";
import type { UniswapV2Router02 } from "@zetachain/protocol-contracts/types/UniswapV2Router02";
import chalk from "chalk";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import ora from "ora";

import { DEFAULT_EVM_RPC_URL } from "../../../../../src/constants/api";

const main = async (
  target: string,
  source: string | undefined,
  rpc: string,
  routerAddress: string,
  json: boolean
) => {
  const spinner = json ? null : ora("Querying withdraw gas fee...").start();

  try {
    const provider = new ethers.JsonRpcProvider(rpc);

    const targetContract = new ethers.Contract(
      target,
      ZRC20ABI.abi,
      provider
    ) as unknown as IZRC20;

    const [gasZRC20, gasFee] = await targetContract.withdrawGasFee();

    // If no source provided, just print the gas token and gas fee
    if (!source) {
      const out = {
        gasFee: gasFee.toString(),
        gasZRC20,
      };

      spinner?.stop();
      spinner?.clear();

      if (json) {
        console.log(JSON.stringify(out, null, 2));
      } else {
        console.log(chalk.blue("\nWithdraw Gas Fee"));
        console.log(`Gas token: ${gasZRC20}`);
        console.log(`Gas fee: ${gasFee.toString()}`);
      }
      return;
    }

    // If source token provided and equals gasZRC20, fee equals gasFee
    if (source.toLowerCase() === gasZRC20.toLowerCase()) {
      const out = {
        gasFee: gasFee.toString(),
        gasZRC20,
        sourceAmount: gasFee.toString(),
        sourceZRC20: source,
      };

      spinner?.stop();
      spinner?.clear();

      if (json) {
        console.log(JSON.stringify(out, null, 2));
      } else {
        console.log(chalk.blue("\nWithdraw Gas Fee"));
        console.log(`Gas token: ${gasZRC20}`);
        console.log(`Gas fee: ${gasFee.toString()}`);
        console.log(chalk.blue("\nSource Requirement"));
        console.log(
          `Source token equals gas token; required amount: ${gasFee.toString()}`
        );
      }
      return;
    }

    // Otherwise, compute how many source tokens are required by routing gasFee(gasZRC20) -> ZETA -> source
    const sourceContract = new ethers.Contract(
      source,
      ZRC20ABI.abi,
      provider
    ) as unknown as IZRC20Metadata;

    const router = new ethers.Contract(
      routerAddress,
      UniswapV2RouterABI.abi,
      provider
    ) as unknown as UniswapV2Router02;

    // Derive ZETA token address via router's WETH() (WZETA on ZetaChain)
    const zetaTokenAddress = await router.WETH();

    // First hop: gasZRC20 fee -> ZETA (amountsIn for gasFee)
    const path1 = [zetaTokenAddress, gasZRC20];
    const amountsInForZeta = (await router.getAmountsIn(
      gasFee,
      path1
    )) as unknown as [bigint, bigint];
    const zetaNeeded = amountsInForZeta[0];

    // Second hop: ZETA -> source (amountsIn for zetaNeeded)
    const path2 = [source, zetaTokenAddress];
    const amountsInForSource = (await router.getAmountsIn(
      zetaNeeded,
      path2
    )) as unknown as [bigint, bigint];
    const sourceNeeded = amountsInForSource[0];

    const sourceDecimals: number = Number(await sourceContract.decimals());

    const out = {
      gasFee: gasFee.toString(),
      gasZRC20,
      sourceAmount: sourceNeeded.toString(),
      sourceDecimals,
      sourceZRC20: source,
    };

    spinner?.stop();
    spinner?.clear();

    if (json) {
      console.log(JSON.stringify(out, null, 2));
    } else {
      console.log(chalk.blue("\nWithdraw Gas Fee"));
      console.log(`Gas token: ${gasZRC20}`);
      console.log(`Gas fee: ${gasFee.toString()}`);
      console.log(chalk.blue("\nSource Requirement"));
      console.log(`Source token: ${source}`);
      console.log(`Required source amount (raw): ${sourceNeeded.toString()}`);
    }
  } catch (error) {
    spinner?.stop();
    spinner?.clear();
    console.error(
      chalk.red(
        error instanceof Error ? error.message : "Unknown error occurred"
      )
    );
  }
};

export const showCommand = new Command("show")
  .description(
    "Show withdraw gas fee for a target ZRC-20, with optional source conversion"
  )
  .addOption(
    new Option(
      "--target <address>",
      "Target ZRC-20 token address"
    ).makeOptionMandatory()
  )
  .addOption(new Option("--source <address>", "Source ZRC-20 token address"))
  .addOption(
    new Option("--rpc <url>", "RPC endpoint URL").default(DEFAULT_EVM_RPC_URL)
  )
  .addOption(
    new Option("--router <address>", "UniswapV2 router address").default(
      "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe"
    )
  )
  .addOption(new Option("--json", "Output results in JSON format"))
  .action(async (options) => {
    const { target, source, rpc, router, json } = options as {
      source?: string;
      json?: boolean;
      router: string;
      rpc: string;
      target: string;
    };
    await main(target, source, rpc, router, Boolean(json));
  });
