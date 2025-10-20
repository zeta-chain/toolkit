import UniswapV2RouterABI from "@uniswap/v2-periphery/build/IUniswapV2Router02.json";
import ZRC20ABI from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import chalk from "chalk";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import ora from "ora";
import { z } from "zod";

import {
  DEFAULT_API_URL,
  DEFAULT_EVM_RPC_URL,
} from "../../../../../src/constants/api";
import {
  IZRC20Contract,
  IZRC20Metadata,
  UniswapV2Router02Contract,
} from "../../../../../types/contracts.types";
import { showFeesDataSchema } from "../../../../../types/fees.types";
import { evmAddressSchema } from "../../../../../types/shared.schema";
import { validateAndParseSchema } from "../../../../../utils/validateAndParseSchema";
import { fetchAllChainData } from "../chains/list";

export type ShowFeesData = z.infer<typeof showFeesDataSchema>;

const showFeesOptionsSchema = z.object({
  api: z.string(),
  gasLimit: z.union([z.string(), z.number()]).optional(),
  json: z.boolean().optional(),
  router: evmAddressSchema,
  rpc: z.string(),
  source: evmAddressSchema.optional(),
  sourceChain: z.union([z.string(), z.number()]).optional(),
  target: evmAddressSchema.optional(),
  targetChain: z.union([z.string(), z.number()]).optional(),
});

export type ShowFeesOptions = z.infer<typeof showFeesOptionsSchema>;

export const fetchShowFeesData = async (
  target: string,
  source: string | undefined,
  rpc: string,
  routerAddress: string,
  api: string,
  gasLimit?: string | number
): Promise<ShowFeesData> => {
  const provider = new ethers.JsonRpcProvider(rpc);

  const targetContract = new ethers.Contract(
    target,
    ZRC20ABI.abi,
    provider
  ) as IZRC20Contract;

  let gasZRC20: string;
  let gasFee: bigint;
  if (gasLimit !== undefined && gasLimit !== null) {
    [gasZRC20, gasFee] = await targetContract.withdrawGasFeeWithGasLimit(
      gasLimit.toString()
    );
  } else {
    [gasZRC20, gasFee] = await targetContract.withdrawGasFee();
  }
  const gasTokenContract = new ethers.Contract(
    gasZRC20,
    ZRC20ABI.abi,
    provider
  ) as IZRC20Metadata;
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
    target: {
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
  ) as IZRC20Metadata;

  const router = new ethers.Contract(
    routerAddress,
    UniswapV2RouterABI.abi,
    provider
  ) as UniswapV2Router02Contract;

  const zetaTokenAddress = await router.WETH();

  const path1 = [zetaTokenAddress, gasZRC20];
  const amountsInForZeta = await router.getAmountsIn(gasFee, path1);
  const zetaNeeded = amountsInForZeta[0];

  const path2 = [source, zetaTokenAddress];
  const amountsInForSource = await router.getAmountsIn(zetaNeeded, path2);
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

const main = async (options: ShowFeesOptions) => {
  const {
    target,
    targetChain,
    source,
    sourceChain,
    rpc,
    router,
    json,
    api,
    gasLimit,
  } = options;

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
      api,
      gasLimit
    );

    spinner?.stop();
    spinner?.clear();

    if (json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    // Fetch tokens metadata to build labels like ASSET.SYMBOL
    const chainData = await fetchAllChainData(api);
    const tokens = chainData.tokens;
    const getTokenLabel = (addr: string, fallbackSymbol: string) => {
      const tok = tokens.find(
        (t) => t.zrc20_contract_address.toLowerCase() === addr.toLowerCase()
      );
      if (!tok) return fallbackSymbol;
      return tok.asset ? `${tok.asset}.${tok.symbol}` : tok.symbol;
    };

    // Target section
    const targetChainName = data.target.chain.name || "Unknown";
    const targetChainId = data.target.chain.id || "-";
    const gasTokenLabel = getTokenLabel(data.target.zrc20, data.target.symbol);
    const targetFeeFormatted = ethers.formatUnits(
      data.target.fee,
      data.target.decimals
    );

    const labelPad = (s: string) => s.padEnd(16, " ");
    console.log(
      `${labelPad("Target Chain")} ${targetChainName} (${targetChainId})`
    );
    console.log(
      `${labelPad("Gas Token")} ${gasTokenLabel} (${data.target.zrc20})`
    );
    if (gasLimit !== undefined && gasLimit !== null) {
      console.log(`${labelPad("Gas Limit")} ${gasLimit}`);
    }
    console.log(
      `${labelPad("Target Fee")} ${targetFeeFormatted} ${gasTokenLabel} (${
        data.target.fee
      } wei)`
    );

    // Source section (if provided)
    if (data.source) {
      console.log();
      const sourceChainName = data.source.chain.name || "Unknown";
      const sourceChainId = data.source.chain.id || "-";
      const sourceTokenLabel = getTokenLabel(
        data.source.zrc20,
        data.source.symbol
      );
      const requiredAmountFormatted = ethers.formatUnits(
        data.source.equalsGas ? data.target.fee : data.source.amount,
        data.source.equalsGas ? data.target.decimals : data.source.decimals
      );
      const requiredAmountRaw = data.source.equalsGas
        ? data.target.fee
        : data.source.amount;

      console.log(
        `${labelPad("Source Chain")} ${sourceChainName} (${sourceChainId})`
      );
      console.log(
        `${labelPad("Source Token")} ${sourceTokenLabel} (${data.source.zrc20})`
      );
      console.log(
        `${labelPad(
          "Required Amount"
        )} ${requiredAmountFormatted} ${sourceTokenLabel} (${requiredAmountRaw} wei)`
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
      "--gas-limit <limit>",
      "Optional gas limit to compute withdraw fee with"
    )
  )
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
  .action(async (options) => {
    const validatedOptions = validateAndParseSchema(
      options,
      showFeesOptionsSchema,
      {
        exitOnError: false,
        shouldLogError: true,
      }
    );
    await main(validatedOptions);
  });
