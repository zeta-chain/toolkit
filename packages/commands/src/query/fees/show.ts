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

export type ShowFeesData = {
  gas: {
    chain: { id?: string; name?: string };
    decimals: number;
    fee: string;
    symbol: string;
    zrc20: string;
  };
  source?: {
    amount: string;
    chain: { id?: string; name?: string };
    decimals: number;
    equalsGas?: boolean;
    symbol: string;
    zrc20: string;
  };
};

export const fetchShowFeesData = async (
  target: string,
  source: string | undefined,
  rpc: string,
  routerAddress: string,
  api: string
): Promise<ShowFeesData> => {
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

  const result: ShowFeesData = {
    gas: {
      chain: getChainMetaByAddress(gasZRC20),
      decimals: gasDecimals,
      fee: gasFee.toString(),
      symbol: gasSymbol,
      zrc20: gasZRC20,
    },
  };

  if (!source) return result;

  if (source.toLowerCase() === gasZRC20.toLowerCase()) {
    result.source = {
      amount: gasFee.toString(),
      chain: getChainMetaByAddress(source),
      decimals: gasDecimals,
      equalsGas: true,
      symbol: gasSymbol,
      zrc20: source,
    };
    return result;
  }

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

  const zetaTokenAddress = await router.WETH();

  const path1 = [zetaTokenAddress, gasZRC20];
  const amountsInForZeta = (await router.getAmountsIn(
    gasFee,
    path1
  )) as unknown as [bigint, bigint];
  const zetaNeeded = amountsInForZeta[0];

  const path2 = [source, zetaTokenAddress];
  const amountsInForSource = (await router.getAmountsIn(
    zetaNeeded,
    path2
  )) as unknown as [bigint, bigint];
  const sourceNeeded = amountsInForSource[0];

  const sourceDecimals: number = Number(await sourceContract.decimals());
  const sourceSymbol: string = await sourceContract.symbol();

  result.source = {
    amount: sourceNeeded.toString(),
    chain: getChainMetaByAddress(source),
    decimals: sourceDecimals,
    equalsGas: false,
    symbol: sourceSymbol,
    zrc20: source,
  };

  return result;
};

const main = async (options: unknown) => {
  const { target, targetChain, source, sourceChain, rpc, router, json, api } =
    options as {
      api: string;
      json?: boolean;
      router: string;
      rpc: string;
      source?: string;
      sourceChain?: string | number;
      target?: string;
      targetChain?: string | number;
    };

  let resolvedTarget = target;
  let resolvedSource = source;

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
        e instanceof Error ? e.message : "Failed to resolve target by chain ID";
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

  // Resolve source by chain ID if not explicitly provided
  if (!resolvedSource && sourceChain) {
    try {
      const chainData = await fetchAllChainData(api);
      const chainId = String(sourceChain);
      const gasToken = chainData.tokens.find(
        (tok) => tok.coin_type === "Gas" && tok.foreign_chain_id === chainId
      );

      if (!gasToken) {
        const msg = `Source gas token not found for chain ID: ${chainId}`;
        if (json) {
          console.log(JSON.stringify({ error: msg }, null, 2));
        } else {
          console.error(msg);
        }
        return;
      }

      resolvedSource = gasToken.zrc20_contract_address;
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to resolve source by chain ID";
      if (json) {
        console.log(JSON.stringify({ error: msg }, null, 2));
      } else {
        console.error(msg);
      }
      return;
    }
  }

  const spinner = json ? null : ora("Querying withdraw gas fee...").start();
  try {
    const data = await fetchShowFeesData(
      resolvedTarget,
      resolvedSource,
      rpc,
      router,
      api
    );

    spinner?.stop();
    spinner?.clear();

    if (json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    const printGasSection = () => {
      console.log(chalk.blue("\nWithdraw Gas Fee"));
      console.log(
        `Chain: ${data.gas.chain.name || "Unknown"} (${
          data.gas.chain.id || "-"
        })`
      );
      console.log(`Gas token: ${data.gas.symbol} (${data.gas.zrc20})`);
      console.log(
        `Gas fee: ${ethers.formatUnits(data.gas.fee, data.gas.decimals)} (${
          data.gas.fee
        })`
      );
    };

    const printSourceRequirement = () => {
      if (!data.source) return;
      console.log(chalk.blue("\nSource Requirement"));
      if (data.source.equalsGas) {
        console.log(
          `Source token equals gas token; required amount: ${ethers.formatUnits(
            data.gas.fee,
            data.gas.decimals
          )} (${data.gas.fee})`
        );
        return;
      }

      console.log(
        `Chain: ${data.source.chain.name || "Unknown"} (${
          data.source.chain.id || "-"
        })`
      );
      console.log(`Source token: ${data.source.symbol} (${data.source.zrc20})`);
      console.log(
        `Required source amount: ${ethers.formatUnits(
          data.source.amount,
          data.source.decimals
        )} (${data.source.amount})`
      );
    };

    printGasSection();
    printSourceRequirement();
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
    new Option(
      "--source-chain <id>",
      "Source chain ID to auto-resolve source ZRC-20"
    )
  )
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
  .action(main);
