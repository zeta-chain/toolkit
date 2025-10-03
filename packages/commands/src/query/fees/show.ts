import UniswapV2RouterABI from "@uniswap/v2-periphery/build/IUniswapV2Router02.json";
import ZRC20ABI from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import type { IZRC20 } from "@zetachain/protocol-contracts/types/IZRC20.sol/IZRC20";
import type { IZRC20Metadata } from "@zetachain/protocol-contracts/types/IZRC20.sol/IZRC20Metadata";
import type { UniswapV2Router02 } from "@zetachain/protocol-contracts/types/UniswapV2Router02";
import chalk from "chalk";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import ora from "ora";

import {
  DEFAULT_API_URL,
  DEFAULT_EVM_RPC_URL,
} from "../../../../../src/constants/api";
import { fetchAllChainData } from "../chains/list";

const main = async (
  target: string,
  source: string | undefined,
  rpc: string,
  routerAddress: string,
  json: boolean,
  api: string
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
    const gasTokenContract = new ethers.Contract(
      gasZRC20,
      ZRC20ABI.abi,
      provider
    ) as unknown as IZRC20Metadata;
    const gasSymbol = await gasTokenContract.symbol();
    const gasDecimals: number = Number(await gasTokenContract.decimals());

    // Resolve chain meta (name + id) via tokens and supported chains (single fetch)
    const chainData = await fetchAllChainData(api);
    const tokens = chainData.tokens;
    const getChainMetaByAddress = (
      addr: string
    ): {
      id?: string;
      name?: string;
    } => {
      const token = tokens.find(
        (c) => c.zrc20_contract_address.toLowerCase() === addr.toLowerCase()
      );
      if (!token) return {};
      const chain = chainData.chains.find(
        (ch) => ch.chain_id === token.foreign_chain_id
      );
      return {
        id: token.foreign_chain_id,
        name: chain?.name || chain?.chain_name,
      };
    };
    const gasChainMeta = getChainMetaByAddress(gasZRC20);

    const printGasSection = () => {
      console.log(chalk.blue("\nWithdraw Gas Fee"));
      console.log(
        `Chain: ${gasChainMeta.name || "Unknown"} (${gasChainMeta.id || "-"})`
      );
      console.log(`Gas token: ${gasSymbol} (${gasZRC20})`);
      console.log(
        `Gas fee: ${ethers.formatUnits(
          gasFee,
          gasDecimals
        )} (${gasFee.toString()})`
      );
    };

    const printSourceEqualsGas = () => {
      console.log(chalk.blue("\nSource Requirement"));
      console.log(
        `Source token equals gas token; required amount: ${ethers.formatUnits(
          gasFee,
          gasDecimals
        )} (${gasFee.toString()})`
      );
    };

    const printSourceRequirement = (
      sourceChainMeta: { id?: string; name?: string },
      sourceSymbolText: string,
      sourceAddress: string,
      requiredAmount: bigint,
      requiredDecimals: number
    ) => {
      console.log(chalk.blue("\nSource Requirement"));
      console.log(
        `Chain: ${sourceChainMeta.name || "Unknown"} (${
          sourceChainMeta.id || "-"
        })`
      );
      console.log(`Source token: ${sourceSymbolText} (${sourceAddress})`);
      console.log(
        `Required source amount: ${ethers.formatUnits(
          requiredAmount,
          requiredDecimals
        )} (${requiredAmount.toString()})`
      );
    };

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
        printGasSection();
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
        printGasSection();
        printSourceEqualsGas();
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
    const sourceSymbol: string = await sourceContract.symbol();

    const out = {
      gasFee: gasFee.toString(),
      gasZRC20,
      sourceAmount: sourceNeeded.toString(),
      sourceDecimals,
      sourceZRC20: source,
    };

    spinner?.stop();
    spinner?.clear();

    const sourceChainMeta = getChainMetaByAddress(source);

    if (json) {
      console.log(JSON.stringify(out, null, 2));
    } else {
      printGasSection();
      printSourceRequirement(
        sourceChainMeta,
        sourceSymbol,
        source,
        sourceNeeded,
        sourceDecimals
      );
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
  .addOption(new Option("--target <address>", "Target ZRC-20 token address"))
  .addOption(
    new Option(
      "--target-chain <id>",
      "Target chain ID to auto-resolve gas token ZRC-20"
    )
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
  .addOption(
    new Option("--api <url>", "API endpoint URL").default(DEFAULT_API_URL)
  )
  .addOption(new Option("--json", "Output results in JSON format"))
  .action(async (options) => {
    const { target, targetChain, source, rpc, router, json, api } = options as {
      api: string;
      json?: boolean;
      router: string;
      rpc: string;
      source?: string;
      target?: string;
      targetChain?: string | number;
    };
    let resolvedTarget = target;

    if (!resolvedTarget && targetChain) {
      try {
        const chainData = await fetchAllChainData(api);
        const chainId = String(targetChain);
        const gasToken = chainData.tokens.find(
          (tok) => tok.coin_type === "Gas" && tok.foreign_chain_id === chainId
        );

        if (!gasToken) {
          const msg = `Gas token not found for chain ID: ${chainId}`;
          if (json) {
            console.log(JSON.stringify({ error: msg }, null, 2));
          } else {
            console.error(msg);
          }
          return;
        }

        resolvedTarget = gasToken.zrc20_contract_address;
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : "Failed to resolve target by chain ID";
        if (json) {
          console.log(JSON.stringify({ error: msg }, null, 2));
        } else {
          console.error(msg);
        }
        return;
      }
    }

    if (!resolvedTarget) {
      const msg = "Either --target or --target-chain must be provided";
      if (json) {
        console.log(JSON.stringify({ error: msg }, null, 2));
      } else {
        console.error(msg);
      }
      return;
    }

    await main(resolvedTarget, source, rpc, router, Boolean(json), api);
  });
