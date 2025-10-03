import UniswapV2RouterABI from "@uniswap/v2-periphery/build/IUniswapV2Router02.json";
import ZRC20ABI from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import chalk from "chalk";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import ora from "ora";

import { DEFAULT_EVM_RPC_URL } from "../../../../../src/constants/api";

const main = async (
  target: string,
  input: string | undefined,
  rpc: string,
  routerAddress: string,
  json: boolean
) => {
  const spinner = json ? null : ora("Querying withdraw gas fee...").start();

  try {
    const provider = new ethers.JsonRpcProvider(rpc);

    const targetContract = new ethers.Contract(target, ZRC20ABI.abi, provider);

    const [gasZRC20, gasFee]: [string, bigint] =
      await targetContract.withdrawGasFee();

    // If no input provided, just print the gas token and gas fee
    if (!input) {
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

    // If input token provided and equals gasZRC20, fee equals gasFee
    if (input.toLowerCase() === gasZRC20.toLowerCase()) {
      const out = {
        gasFee: gasFee.toString(),
        gasZRC20,
        inputAmount: gasFee.toString(),
        inputZRC20: input,
      };

      spinner?.stop();
      spinner?.clear();

      if (json) {
        console.log(JSON.stringify(out, null, 2));
      } else {
        console.log(chalk.blue("\nWithdraw Gas Fee"));
        console.log(`Gas token: ${gasZRC20}`);
        console.log(`Gas fee: ${gasFee.toString()}`);
        console.log(chalk.blue("\nInput Requirement"));
        console.log(
          `Input token equals gas token; required amount: ${gasFee.toString()}`
        );
      }
      return;
    }

    // Otherwise, compute how many input tokens are required by routing gasFee(gasZRC20) -> ZETA -> input
    const inputContract = new ethers.Contract(input, ZRC20ABI.abi, provider);

    const router = new ethers.Contract(
      routerAddress,
      UniswapV2RouterABI.abi,
      provider
    );

    // Derive ZETA token address via router's WETH() (WZETA on ZetaChain)
    const zetaTokenAddress = await router.WETH();

    // First hop: gasZRC20 fee -> ZETA (amountsIn for gasFee)
    const path1 = [zetaTokenAddress, gasZRC20];
    const amountsInForZeta = await router.getAmountsIn(gasFee, path1);
    const zetaNeeded = amountsInForZeta[0];

    // Second hop: ZETA -> input (amountsIn for zetaNeeded)
    const path2 = [input, zetaTokenAddress];
    const amountsInForInput = await router.getAmountsIn(zetaNeeded, path2);
    const inputNeeded = amountsInForInput[0];

    const inputDecimals: number = await inputContract.decimals();

    const out = {
      gasFee: gasFee.toString(),
      gasZRC20,
      inputAmount: inputNeeded.toString(),
      inputDecimals,
      inputZRC20: input,
    };

    spinner?.stop();
    spinner?.clear();

    if (json) {
      console.log(JSON.stringify(out, null, 2));
    } else {
      console.log(chalk.blue("\nWithdraw Gas Fee"));
      console.log(`Gas token: ${gasZRC20}`);
      console.log(`Gas fee: ${gasFee.toString()}`);
      console.log(chalk.blue("\nInput Requirement"));
      console.log(`Input token: ${input}`);
      console.log(`Required input amount (raw): ${inputNeeded.toString()}`);
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
    "Show withdraw gas fee for a target ZRC-20, with optional input conversion"
  )
  .addOption(
    new Option(
      "--target <address>",
      "Target ZRC-20 token address"
    ).makeOptionMandatory()
  )
  .addOption(new Option("--input <address>", "Input ZRC-20 token address"))
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
    const { target, input, rpc, router, json } = options as {
      input?: string;
      json?: boolean;
      router: string;
      rpc: string;
      target: string;
    };
    await main(target, input, rpc, router, Boolean(json));
  });
