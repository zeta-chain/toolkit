import { bech32 } from "bech32";
import chalk from "chalk";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import ora from "ora";
import { getBorderCharacters, table } from "table";
import { z } from "zod";

import {
  MULTICALL_ADDRESS,
  STAKING_PRECOMPILE,
} from "../../../../../src/constants/addresses";
import { DEFAULT_EVM_RPC_URL } from "../../../../../src/constants/api";
import {
  evmAddressSchema,
  rpcOrChainIdRefineRule,
} from "../../../../../types/shared.schema";
import { validateAndParseSchema } from "../../../../../utils";
import { getRpcUrl } from "../../../../../utils/chains";
import MULTICALL3_ABI from "../../../../../utils/multicall3.json";
import stakingArtifact from "../staking.json";

const STAKING_ABI = (stakingArtifact as { abi: unknown })
  .abi as ethers.InterfaceAbi;

type DelegationRow = {
  balance: bigint;
  shares: bigint;
  validator: string;
};

const formatUnitsSafe = (value: bigint, decimals: number): string => {
  try {
    return ethers.formatUnits(value, decimals);
  } catch {
    return String(value);
  }
};

const toBech32OrUndefined = (
  prefix: string,
  hex: string | undefined
): string | undefined => {
  if (!hex || typeof hex !== "string") return undefined;
  const isHex20 = /^0x[0-9a-fA-F]{40}$/.test(hex);
  if (!isHex20) return undefined;
  try {
    const clean = hex.slice(2);
    const bytes = Buffer.from(clean, "hex");
    const words = bech32.toWords(bytes);
    return bech32.encode(prefix, words);
  } catch {
    return undefined;
  }
};

const optionsSchema = z
  .object({
    address: evmAddressSchema,
    chainId: z.string().optional(),
    json: z.boolean().optional(),
    rpc: z.string().optional(),
  })
  .refine(rpcOrChainIdRefineRule.rule, {
    message: rpcOrChainIdRefineRule.message,
  });

type Options = z.infer<typeof optionsSchema>;

const main = async (rawOptions: unknown) => {
  const options = validateAndParseSchema<Options>(rawOptions, optionsSchema, {
    exitOnError: true,
  });
  const spinner = options.json ? null : ora("Fetching delegations...").start();

  try {
    const rpcUrl =
      options.rpc || getRpcUrl(parseInt(options.chainId ?? "7001"));
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const delegator = options.address;
    const contract = new ethers.Contract(
      STAKING_PRECOMPILE,
      STAKING_ABI,
      provider
    );

    // Fetch validators across all statuses to ensure complete coverage
    const statusSets: Array<
      "Bonded" | "Unbonding" | "Unbonded" | "Unspecified"
    > = ["Unspecified", "Bonded", "Unbonding", "Unbonded"];

    const buildStatusCandidates = (
      status: "Bonded" | "Unbonding" | "Unbonded" | "Unspecified"
    ): string[] => {
      const map: Record<string, string> = {
        Bonded: "BOND_STATUS_BONDED",
        Unbonded: "BOND_STATUS_UNBONDED",
        Unbonding: "BOND_STATUS_UNBONDING",
        Unspecified: "BOND_STATUS_UNSPECIFIED",
      };
      if (status === "Unspecified") {
        return ["", map[status], "Unspecified", "unspecified"];
      }
      const lower = status.toLowerCase();
      const upper = status.toUpperCase();
      return [map[status], status, lower, upper];
    };

    const validatorSet = new Set<string>();

    const fetchValidatorsForStatus = async (
      status: "Bonded" | "Unbonding" | "Unbonded" | "Unspecified"
    ): Promise<string[]> => {
      let totalValidators: number | undefined = undefined;
      let nextKey: string | undefined = "0x";
      let chosenStatus: string | null = null;
      let lastError: unknown = null;
      let hasMore = true;
      const localSet = new Set<string>();
      const candidates = buildStatusCandidates(status);

      while (hasMore) {
        const pagination = {
          countTotal: totalValidators === undefined,
          key: nextKey || "0x",
          limit: 100,
          offset: 0,
          reverse: false,
        };

        let pageResult: unknown = null;
        if (chosenStatus) {
          pageResult = await contract.validators(chosenStatus, pagination);
        } else {
          for (const candidate of candidates) {
            try {
              pageResult = await contract.validators(candidate, pagination);
              chosenStatus = candidate;
              lastError = null;
              break;
            } catch (err) {
              lastError = err;
              continue;
            }
          }
        }

        if (!pageResult && lastError) break;

        let pageValidators: unknown[] = [];
        let pageResponse: unknown = {};
        if (Array.isArray(pageResult)) {
          pageValidators = (pageResult[0] ?? []) as unknown[];
          pageResponse = pageResult[1] ?? {};
        } else if (
          pageResult &&
          typeof pageResult === "object" &&
          ("validators" in (pageResult as any) ||
            "pageResponse" in (pageResult as any))
        ) {
          const pr = pageResult as any;
          if (Array.isArray(pr.validators)) {
            pageValidators = pr.validators as unknown[];
          }
          pageResponse = pr.pageResponse ?? {};
        }

        for (const v of pageValidators) {
          const operator = (v as { operatorAddress?: string })?.operatorAddress;
          if (typeof operator === "string" && operator.length > 0) {
            localSet.add(operator);
          }
        }

        if (totalValidators === undefined) {
          try {
            const totalRaw = (pageResponse as { total?: unknown } as any)
              ?.total;
            if (totalRaw !== undefined) {
              const str = (
                totalRaw as { toString?: () => string }
              )?.toString?.();
              totalValidators = Number(str ?? totalRaw);
            }
          } catch {
            // ignore
          }
        }

        let nk: string | undefined = undefined;
        if (
          pageResponse &&
          typeof pageResponse === "object" &&
          "nextKey" in (pageResponse as any)
        ) {
          const maybe = (pageResponse as any).nextKey;
          nk = typeof maybe === "string" ? maybe : undefined;
        } else if (Array.isArray(pageResponse)) {
          const arr = pageResponse as unknown[];
          const maybe = arr[0];
          nk = typeof maybe === "string" ? maybe : undefined;
        }

        if (
          !nk ||
          nk === "0x" ||
          nk === "0x00" ||
          pageValidators.length === 0
        ) {
          hasMore = false;
        } else {
          nextKey = nk;
        }
      }

      return Array.from(localSet);
    };

    const results = await Promise.all(
      statusSets.map((status) => fetchValidatorsForStatus(status))
    );
    for (const arr of results) {
      for (const op of arr) {
        validatorSet.add(op);
      }
    }

    const validators = Array.from(validatorSet);

    // Batch query delegations via Multicall3
    const rows: DelegationRow[] = [];
    const iface = new ethers.Interface(STAKING_ABI);
    const multicall = new ethers.Contract(
      MULTICALL_ADDRESS,
      MULTICALL3_ABI,
      provider
    );

    const validatorAddresses = validators.map((op) => {
      const b32 = toBech32OrUndefined("zetavaloper", op);
      return b32 || op;
    });

    const calls = validatorAddresses.map((va) => ({
      callData: iface.encodeFunctionData("delegation", [delegator, va]),
      target: STAKING_PRECOMPILE,
    }));

    // Small utility to run tasks with bounded concurrency
    const mapWithConcurrency = async <T, R>(
      items: T[],
      limit: number,
      fn: (item: T, index: number) => Promise<R>
    ): Promise<R[]> => {
      const results: R[] = new Array(items.length);
      let cursor = 0;
      const workers = new Array(Math.min(limit, items.length))
        .fill(0)
        .map(async () => {
          while (true) {
            const index = cursor++;
            if (index >= items.length) break;
            try {
              results[index] = await fn(items[index], index);
            } catch (e) {
              // @ts-expect-error allow sparse result on error
              results[index] = undefined;
            }
          }
        });
      await Promise.all(workers);
      return results;
    };

    // Process multicall chunks in parallel with a safe concurrency limit
    const chunkSize = 100;
    const chunks: {
      start: number;
      items: { callData: string; target: string }[];
    }[] = [];
    for (let i = 0; i < calls.length; i += chunkSize) {
      chunks.push({ start: i, items: calls.slice(i, i + chunkSize) });
    }

    const processChunk = async (chunk: {
      start: number;
      items: { callData: string; target: string }[];
    }): Promise<DelegationRow[]> => {
      const localRows: DelegationRow[] = [];
      try {
        const [, returnData] = (await multicall.aggregate(chunk.items)) as [
          bigint,
          string[]
        ];
        for (let j = 0; j < returnData.length; j++) {
          const data = returnData[j];
          try {
            const decoded = iface.decodeFunctionResult("delegation", data);
            const shares = decoded[0] as bigint;
            const balance = decoded[1] as { amount: bigint; denom: string };
            const balanceAmount = balance?.amount ?? 0n;
            if (shares > 0n || balanceAmount > 0n) {
              const idx = chunk.start + j;
              localRows.push({
                balance: balanceAmount,
                shares,
                validator: validatorAddresses[idx],
              });
            }
          } catch {
            continue;
          }
        }
        return localRows;
      } catch {
        // Fallback: parallelize single calls with smaller concurrency
        const indices = Array.from(
          { length: chunk.items.length },
          (_, j) => chunk.start + j
        );
        const perValidatorRows = await mapWithConcurrency(
          indices,
          10,
          async (idx) => {
            const validatorAddress = validatorAddresses[idx];
            try {
              const [shares, balance] = (await contract.delegation(
                delegator,
                validatorAddress
              )) as [bigint, { amount: bigint; denom: string }];
              const balanceAmount = balance?.amount ?? 0n;
              if (shares > 0n || balanceAmount > 0n) {
                return {
                  balance: balanceAmount,
                  shares,
                  validator: validatorAddress,
                } as DelegationRow;
              }
            } catch {
              // ignore individual failures
            }
            // return empty marker
            return undefined as unknown as DelegationRow;
          }
        );
        for (const r of perValidatorRows) {
          if (r && typeof r.validator === "string") localRows.push(r);
        }
        return localRows;
      }
    };

    const chunkResults = await mapWithConcurrency(chunks, 5, processChunk);
    for (const cr of chunkResults) {
      if (Array.isArray(cr)) rows.push(...cr);
    }

    if (!options.json) {
      spinner?.succeed(
        `Fetched ${rows.length} delegation${rows.length === 1 ? "" : "s"}`
      );
    }

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            delegations: rows.map((r) => ({
              balance: r.balance.toString(),
              shares: r.shares.toString(),
              validator: r.validator,
            })),
            delegator,
          },
          null,
          2
        )
      );
      return;
    }

    if (rows.length === 0) {
      console.log(chalk.yellow("No delegations found"));
      return;
    }

    const tableData = [
      ["Validator", "Shares", "Balance (ZETA)"],
      ...rows.map((r) => [
        r.validator,
        r.shares.toString(),
        formatUnitsSafe(r.balance, 18),
      ]),
    ];
    const output = table(tableData, {
      border: getBorderCharacters("norc"),
      columnDefault: { wrapWord: true },
    });
    console.log(output);
  } catch (error) {
    if (!options.json) {
      spinner?.fail("Failed to fetch delegations");
    }
    console.error(chalk.red("Error details:"), error);
  }
};

export const listCommand = new Command("list")
  .alias("l")
  .description("List delegations for a delegator")
  .addOption(
    new Option(
      "--address <address>",
      "EVM address of the delegator"
    ).makeOptionMandatory()
  )
  .addOption(
    new Option("--rpc <url>", "RPC endpoint URL").default(DEFAULT_EVM_RPC_URL)
  )
  .addOption(new Option("--chain-id <id>", "ZetaChain chain ID"))
  .addOption(new Option("--json", "Output as JSON"))
  .action(async (rawOptions) => {
    await main(rawOptions);
  });
