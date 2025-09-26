import chalk from "chalk";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import ora from "ora";
import { getBorderCharacters, table } from "table";

import { validatorsListOptionsSchema } from "../../../../../src/schemas/commands/validators";

const STAKING_PRECOMPILE =
  "0x0000000000000000000000000000000000000800" as const;

const STAKING_ABI = [
  // Match the posted artifact types for compatibility
  "function validators(string status, (bytes key, uint64 offset, uint64 limit, bool countTotal, bool reverse) pageRequest) view returns ((string operatorAddress, string consensusPubkey, bool jailed, uint8 status, uint256 tokens, uint256 delegatorShares, string description, int64 unbondingHeight, int64 unbondingTime, uint256 commission, uint256 minSelfDelegation)[] validators, (bytes nextKey, uint64 total) pageResponse)",
] as const;

const formatValidatorsTable = (validators: any[], tokenDecimals: number) => {
  const headers = [
    "Moniker",
    "Operator",
    "Status",
    "Jailed",
    "Voting Power",
    "Commission",
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
    if (typeof val === "object" && (val as any)?.commissionRates?.rate) {
      const rateStr = String((val as any).commissionRates.rate);
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
    const votingPower = v.tokens
      ? toRounded2(ethers.formatUnits(v.tokens, tokenDecimals))
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

    return [
      moniker,
      v.operatorAddress,
      statusMap[v.status] ?? String(v.status),
      v.jailed ? "true" : "false",
      votingPower,
      commissionPct,
    ];
  });

  return [headers, ...rows];
};

const main = async (options: {
  rpc: string;
  status: "Bonded" | "Unbonding" | "Unbonded" | "Unspecified";
  limit: number;
  json: boolean;
  decimals: number;
}) => {
  const spinner = options.json ? null : ora("Fetching validators...").start();

  try {
    const provider = new ethers.JsonRpcProvider(options.rpc);
    const contract = new ethers.Contract(
      STAKING_PRECOMPILE,
      STAKING_ABI,
      provider
    );

    const pagination = {
      key: "0x",
      offset: 0,
      limit: options.limit,
      countTotal: true,
      reverse: false,
    };

    // Try Cosmos enum-style values first (BOND_STATUS_*), then other variants.
    const buildStatusCandidates = (
      status: "Bonded" | "Unbonding" | "Unbonded" | "Unspecified"
    ): string[] => {
      const map: Record<string, string> = {
        Bonded: "BOND_STATUS_BONDED",
        Unbonding: "BOND_STATUS_UNBONDING",
        Unbonded: "BOND_STATUS_UNBONDED",
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

    let result: any;
    let lastError: unknown = null;
    for (const candidate of candidates) {
      try {
        // eslint-disable-next-line no-await-in-loop
        result = await contract.validators(candidate, pagination);
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        continue;
      }
    }

    if (!result && lastError) throw lastError;

    const validators = result.validators ?? result[0] ?? [];
    const pageResponse = result.pageResponse ?? result[1] ?? {};

    if (!options.json) {
      spinner?.succeed(
        `Fetched ${validators.length} validators` +
          (pageResponse?.total ? ` of ${pageResponse.total}` : "")
      );
    }

    if (options.json) {
      console.log(JSON.stringify({ validators, pageResponse }, null, 2));
      return;
    }

    if (validators.length === 0) {
      console.log(chalk.yellow("No validators found"));
      return;
    }

    const tableData = formatValidatorsTable(validators, options.decimals);
    const tableOutput = table(tableData, {
      border: getBorderCharacters("norc"),
      columns: {
        0: { width: 20, wrapWord: true }, // Moniker
        1: { width: 46, wrapWord: true }, // Operator
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
  .description("List validators from staking precompile")
  .addOption(new Option("--rpc <url>", "RPC endpoint URL"))
  .addOption(
    new Option("--status <status>", "Validator status filter").choices([
      "Bonded",
      "Unbonding",
      "Unbonded",
      "Unspecified",
    ]) as any
  )
  .addOption(new Option("--limit <n>", "Pagination limit"))
  .addOption(new Option("--json", "Output as JSON"))
  .addOption(
    new Option("--decimals <n>", "Token decimals for voting power formatting")
  )
  .action(async (rawOptions) => {
    const options = validatorsListOptionsSchema.parse(rawOptions);
    await main(options);
  });
