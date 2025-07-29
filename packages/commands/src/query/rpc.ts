import chalk from "chalk";
import { Command, Option } from "commander";
import type { Chain } from "viem";
import * as viemChains from "viem/chains";
import { z } from "zod";

const rpcOptionsSchema = z.object({
  chainId: z.coerce.number().int().positive(),
  json: z.boolean().default(false),
});

type RpcOptions = z.infer<typeof rpcOptionsSchema>;

/**
 * Return the first default HTTP RPC URL for a given EVM chain-id using the
 * built-in chain definitions shipped with `viem`.
 * Throws if the chain cannot be found or has no default HTTP RPC URL.
 */
export const getRpcUrl = (chainId: number): string => {
  const chain = (Object.values(viemChains) as Chain[]).find(
    (c): c is Chain =>
      typeof c === "object" && c !== null && "id" in c && c.id === chainId
  );

  if (!chain) {
    throw new Error(`Chain with id ${chainId} not found in viem\x2fchains`);
  }

  const urls = chain.rpcUrls?.default?.http;
  if (!urls || urls.length === 0) {
    throw new Error(`No default HTTP RPC URL defined for chain ${chainId}`);
  }

  return urls[0];
};

const main = (options: RpcOptions) => {
  try {
    const url = getRpcUrl(options.chainId);
    if (options.json) {
      console.log(
        JSON.stringify({ chainId: options.chainId, rpcUrl: url }, null, 2)
      );
    } else {
      console.log(url);
    }
  } catch (error) {
    console.error(
      chalk.red(error instanceof Error ? error.message : String(error))
    );
    process.exitCode = 1;
  }
};

export const rpcCommand = new Command("rpc")
  .summary("Return default RPC URL for an EVM chain by chain ID")
  .addOption(
    new Option(
      "--chain-id <id>",
      "EVM chain ID (e.g., 1 for Ethereum mainnet)"
    ).makeOptionMandatory()
  )
  .option("--json", "Output result as JSON")
  .action((options: RpcOptions) => {
    const validated = rpcOptionsSchema.parse(options);
    main(validated);
  });
