import chalk from "chalk";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import ora from "ora";

import ZRC20ABI from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";

import { DEFAULT_EVM_RPC_URL } from "../../../../../src/constants/api";

const main = async (
  target: string,
  input: string | undefined,
  rpc: string,
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
        gasZRC20,
        gasFee: gasFee.toString(),
      };

      if (json) {
        console.log(JSON.stringify(out, null, 2));
      } else {
        console.log(chalk.blue("\nWithdraw Gas Fee"));
        console.log(`Gas token: ${gasZRC20}`);
        console.log(`Gas fee: ${gasFee.toString()}`);
      }
      spinner?.succeed("Done");
      return;
    }

    // If input token provided and equals gasZRC20, fee equals gasFee
    if (input.toLowerCase() === gasZRC20.toLowerCase()) {
      const out = {
        gasZRC20,
        gasFee: gasFee.toString(),
        inputAmount: gasFee.toString(),
        inputZRC20: input,
      };
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
      spinner?.succeed("Done");
      return;
    }

    // Otherwise, compute how many input tokens are required by routing gasFee(gasZRC20) -> ZETA -> input
    const inputContract = new ethers.Contract(input, ZRC20ABI.abi, provider);

    // We need ZETA token address on testnet
    const zetaTokenAddress = (
      await import("@zetachain/protocol-contracts")
    ).getAddress("zetaToken", "zeta_testnet");
    if (!zetaTokenAddress) {
      throw new Error("Cannot get ZETA token address");
    }

    // Reuse Uniswap V2 Router via packages/client getQuote util style
    const { default: UniswapV2RouterABI } = await import(
      "@uniswap/v2-periphery/build/IUniswapV2Router02.json"
    );
    const { getAddress } = await import("@zetachain/protocol-contracts");
    const routerAddress = getAddress("uniswapV2Router02", "zeta_testnet");
    if (!routerAddress) throw new Error("Cannot get uniswapV2Router02 address");

    const router = new ethers.Contract(
      routerAddress,
      UniswapV2RouterABI.abi,
      provider
    );

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
      gasZRC20,
      gasFee: gasFee.toString(),
      inputZRC20: input,
      inputAmount: inputNeeded.toString(),
      inputDecimals,
    };

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

    spinner?.succeed();
  } catch (error) {
    spinner?.fail("Failed to query fees");
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
  .addOption(new Option("--json", "Output results in JSON format"))
  .action(async (options) => {
    const { target, input, rpc, json } = options as {
      target: string;
      input?: string;
      rpc: string;
      json?: boolean;
    };
    await main(target, input, rpc, Boolean(json));
  });
