import chalk from "chalk";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import ora from "ora";
import { getBorderCharacters, table } from "table";

import { DEFAULT_EVM_RPC_URL } from "../../../../../src/constants/api";
import { validatorsListOptionsSchema } from "../../../../../src/schemas/commands/validators";

const STAKING_PRECOMPILE = "0x0000000000000000000000000000000000000800";

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
    const validators: any[] = [];
    let totalValidators: number | undefined = undefined;
    let nextKey: string | undefined = "0x";
    let chosenStatus: string | null = null;
    let lastError: unknown = null;

    while (true) {
      const pagination = {
        countTotal: totalValidators === undefined,
        key: nextKey || "0x",
        limit: 100,
        offset: 0, // only request count on first page
        reverse: false,
      };

      let pageResult: any = null;

      if (chosenStatus) {
        pageResult = await contract.validators(chosenStatus, pagination);
      } else {
        for (const candidate of candidates) {
          try {
            // eslint-disable-next-line no-await-in-loop
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

      const pageValidators = pageResult.validators ?? pageResult[0] ?? [];
      const pageResponse = pageResult.pageResponse ?? pageResult[1] ?? {};

      // total may be string/BigInt/number; normalize once
      if (totalValidators === undefined) {
        const totalRaw =
          pageResponse?.total ??
          (Array.isArray(pageResponse) ? pageResponse[1] : undefined);
        if (totalRaw !== undefined) {
          try {
            totalValidators = Number(totalRaw.toString());
          } catch {
            totalValidators = Number(totalRaw);
          }
        }
      }

      validators.push(...pageValidators);

      const nk = (pageResponse?.nextKey ??
        (Array.isArray(pageResponse) ? pageResponse[0] : undefined)) as
        | string
        | undefined;
      // Stop if no next key or empty
      if (!nk || nk === "0x" || nk === "0x00" || pageValidators.length === 0) {
        break;
      }
      nextKey = nk;
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
        0: { truncate: 20, width: 21 },
        1: {},
        2: {},
        3: {},
        4: {},
        5: {},
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
      .default("Bonded") as any
  )
  .addOption(new Option("--json", "Output as JSON"))
  .action(async (rawOptions) => {
    const options = validatorsListOptionsSchema.parse(rawOptions);
    await main(options);
  });
