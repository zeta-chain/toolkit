import chalk from "chalk";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import { bech32 } from "bech32";
import ora from "ora";
import { getBorderCharacters, table } from "table";

import { DEFAULT_EVM_RPC_URL } from "../../../../../src/constants/api";
import { validatorsListOptionsSchema } from "../../../../../src/schemas/commands/validators";
import stakingArtifact from "./staking.json";

const STAKING_PRECOMPILE = "0x0000000000000000000000000000000000000800";

const STAKING_ABI = (stakingArtifact as { abi: unknown })
  .abi as ethers.InterfaceAbi;

type ValidatorRowInput = {
  commission?: unknown;
  consensusPubkey?: string;
  delegatorShares?: unknown;
  description?: string | { moniker?: string };
  jailed?: boolean;
  minSelfDelegation?: unknown;
  operatorAddress?: string;
  status?: number;
  tokens?: unknown;
  unbondingHeight?: unknown;
  unbondingTime?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const extractCommissionRate = (value: unknown): string | undefined => {
  if (!isRecord(value)) return undefined;
  const cr = value["commissionRates"];
  if (!isRecord(cr)) return undefined;
  const rate = cr["rate"];
  return rate === undefined ? undefined : String(rate);
};

const formatUnitsSafe = (value: unknown, decimals: number): string => {
  try {
    const asBig = BigInt(String(value));
    return ethers.formatUnits(asBig, decimals);
  } catch {
    return "-";
  }
};

const formatValidatorsTable = (
  validators: ValidatorRowInput[],
  tokenDecimals: number
): string[][] => {
  const headers = [
    "Moniker",
    "Operator",
    "Status",
    "Jailed",
    "Voting Power",
    "Comm",
  ];

  const toRounded2 = (val: string): string => {
    const n = Number(val);
    if (!Number.isFinite(n)) return val;
    const fixed = n.toFixed(2);
    return fixed.replace(/\.00$/, "");
  };

  const formatCommissionPercent = (val: unknown): string => {
    if (val == null) return "-";
    // If nested struct -> string rate in [0,1]
    const rateStrFromNested = extractCommissionRate(val);
    if (rateStrFromNested !== undefined) {
      const rateStr = rateStrFromNested;
      const n = Number(rateStr);
      if (Number.isFinite(n)) return `${toRounded2(String(n * 100))}%`;
      return `${rateStr}%`;
    }
    // If raw uint256 scaled by 1e18 representing a fraction (1.0 = 1e18)
    try {
      const asBig = BigInt(String(val));
      const fraction = Number(ethers.formatUnits(asBig, 18));
      if (Number.isFinite(fraction)) {
        const pct = fraction * 100;
        return `${toRounded2(String(pct))}%`;
      }
      return `${ethers.formatUnits(asBig, 18)}%`;
    } catch {
      const num = Number(String(val));
      if (Number.isFinite(num)) return `${toRounded2(String(num * 100))}%`;
      return `${String(val)}%`;
    }
  };

  const rows = validators.map((v) => {
    const votingPower =
      v.tokens != null
        ? toRounded2(formatUnitsSafe(v.tokens, tokenDecimals))
        : "-";
    const commissionPct = formatCommissionPercent(v.commission);

    const statusMap: Record<number, string> = {
      0: "Unspecified",
      1: "Unbonded",
      2: "Unbonding",
      3: "Bonded",
    };

    // Support both string and struct description
    const moniker =
      typeof v.description === "string"
        ? v.description
        : v.description?.moniker || "-";

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

    const operatorHex = v.operatorAddress ?? "-";
    const operatorBech32 = toBech32OrUndefined(
      "zetavaloper",
      v.operatorAddress
    );
    const operatorDisplay = operatorBech32
      ? `${operatorHex}\n${operatorBech32}`
      : operatorHex;

    return [
      moniker,
      operatorDisplay,
      v.status == null ? "-" : statusMap[v.status] ?? String(v.status),
      v.jailed ? "true" : "false",
      votingPower,
      commissionPct,
    ];
  });

  return [headers, ...rows];
};

const main = async (options: {
  json?: boolean;
  rpc: string;
  status: "Bonded" | "Unbonding" | "Unbonded" | "Unspecified";
}) => {
  const spinner = options.json ? null : ora("Fetching validators...").start();

  try {
    const provider = new ethers.JsonRpcProvider(options.rpc);
    const contract = new ethers.Contract(
      STAKING_PRECOMPILE,
      STAKING_ABI,
      provider
    );

    // Try Cosmos enum-style values first (BOND_STATUS_*), then other variants.
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
        return ["", map[status], "Unspecified", "unspecified"]; // empty fetches all on some nodes
      }
      const lower = status.toLowerCase();
      const upper = status.toUpperCase();
      return [map[status], status, lower, upper];
    };

    const candidates = buildStatusCandidates(options.status);

    // Auto-paginate until all validators are fetched
    const validators: ValidatorRowInput[] = [];
    let totalValidators: number | undefined = undefined;
    let nextKey: string | undefined = "0x";
    let chosenStatus: string | null = null;
    let lastError: unknown = null;

    let hasMore = true;
    while (hasMore) {
      const pagination = {
        countTotal: totalValidators === undefined,
        key: nextKey || "0x",
        limit: 100,
        offset: 0, // only request count on first page
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

      if (!pageResult && lastError) throw lastError;

      let pageValidators: ValidatorRowInput[] = [];
      let pageResponse: unknown = {};

      if (Array.isArray(pageResult)) {
        pageValidators = (pageResult[0] ?? []) as ValidatorRowInput[];
        pageResponse = pageResult[1] ?? {};
      } else if (isRecord(pageResult)) {
        const validatorsField = pageResult["validators"];
        if (Array.isArray(validatorsField)) {
          pageValidators = validatorsField as ValidatorRowInput[];
        }
        pageResponse = pageResult["pageResponse"] ?? {};
      }

      // total may be string/BigInt/number; normalize once
      if (totalValidators === undefined) {
        let totalRaw: unknown = undefined;
        if (isRecord(pageResponse) && "total" in pageResponse) {
          totalRaw = pageResponse["total"];
        } else if (Array.isArray(pageResponse)) {
          totalRaw = pageResponse[1];
        }
        if (totalRaw !== undefined) {
          try {
            const toStr = (
              totalRaw as { toString?: () => string }
            )?.toString?.();
            totalValidators = Number(toStr ?? totalRaw);
          } catch {
            totalValidators = Number(totalRaw as number);
          }
        }
      }

      validators.push(...pageValidators);

      let nk: string | undefined = undefined;
      if (isRecord(pageResponse) && "nextKey" in pageResponse) {
        const maybe = pageResponse["nextKey"];
        nk = typeof maybe === "string" ? maybe : undefined;
      } else if (Array.isArray(pageResponse)) {
        const arr = pageResponse as unknown[];
        const maybe = arr[0];
        nk = typeof maybe === "string" ? maybe : undefined;
      }
      // Stop if no next key or empty
      if (!nk || nk === "0x" || nk === "0x00" || pageValidators.length === 0) {
        hasMore = false;
      } else {
        nextKey = nk;
      }
    }

    if (!options.json) {
      spinner?.succeed(
        `Fetched ${validators.length} validators` +
          (totalValidators !== undefined ? ` of ${totalValidators}` : "")
      );
    }

    if (options.json) {
      const bigintSafe = (_key: string, value: unknown) =>
        typeof value === "bigint" ? value.toString() : value;
      console.log(
        JSON.stringify(
          { pageResponse: { total: totalValidators }, validators },
          bigintSafe,
          2
        )
      );
      return;
    }

    if (validators.length === 0) {
      console.log(chalk.yellow("No validators found"));
      return;
    }

    const tableData = formatValidatorsTable(validators, 18);
    const tableOutput = table(tableData, {
      border: getBorderCharacters("norc"),
      columnDefault: { wrapWord: true },
      columns: {
        0: { width: 25 },
      },
    });

    console.log(tableOutput);
  } catch (error) {
    if (!options.json) {
      spinner?.fail("Failed to fetch validators");
    }
    console.error(chalk.red("Error details:"), error);
  }
};

export const listCommand = new Command("list")
  .alias("l")
  .description("List of validators")
  .addOption(
    new Option("--rpc <url>", "RPC endpoint URL").default(DEFAULT_EVM_RPC_URL)
  )
  .addOption(
    new Option("--status <status>", "Validator status filter")
      .choices(["Bonded", "Unbonding", "Unbonded", "Unspecified"])
      .default("Bonded")
  )
  .addOption(new Option("--json", "Output as JSON"))
  .action(async (rawOptions) => {
    const options = validatorsListOptionsSchema.parse(rawOptions);
    await main(options);
  });
