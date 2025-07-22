import chalk from "chalk";
import { Command, Option } from "commander";
import ora from "ora";
import { ethers } from "ethers";
import { getBorderCharacters, table } from "table";
import { z } from "zod";
import RegistryABI from "@zetachain/protocol-contracts/abi/Registry.sol/Registry.json";
import { contractsListOptionsSchema } from "../../../../../src/schemas/commands/contracts";
import { DEFAULT_EVM_RPC_URL } from "../../../../../src/constants/api";

type ContractsListOptions = z.infer<typeof contractsListOptionsSchema>;

const CONTRACT_REGISTRY_ADDRESS = "0x7cce3eb018bf23e1fe2a32692f2c77592d110394";

/**
 * Attempts to extract and checksum‑encode a valid 20‑byte EVM address from the
 * supplied bytes‑hex string. If none can be found, returns `null`.
 */
const tryParseEvmAddress = (bytesHex: string): string | null => {
  const clean = bytesHex.toLowerCase();

  // Case 1 – value is already a 20‑byte address (0x + 40 hex chars)
  if (clean.length === 42 && ethers.isAddress(clean)) {
    return ethers.getAddress(clean);
  }

  // Case 2 – value is a left‑padded bytes32: slice last 40 hex chars
  if (clean.length === 66) {
    const potential = `0x${clean.slice(-40)}`;
    if (ethers.isAddress(potential)) {
      return ethers.getAddress(potential);
    }
  }

  return null;
};

/**
 * Decodes a bytes‑hex string into ASCII, trimming any trailing null bytes.
 */
const toAscii = (bytesHex: string): string => {
  try {
    return ethers.toUtf8String(bytesHex).replace(/\x00+$/g, "");
  } catch {
    return bytesHex;
  }
};

const formatAddress = (bytesHex: string): string => {
  const evm = tryParseEvmAddress(bytesHex);
  return evm ?? toAscii(bytesHex);
};

export const fetchContracts = async (rpcUrl: string): Promise<any[]> => {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contractRegistry = new ethers.Contract(
    CONTRACT_REGISTRY_ADDRESS,
    RegistryABI.abi,
    provider
  );

  const contracts = await contractRegistry.getAllContracts();
  return contracts;
};

const formatContractsTable = (
  contracts: any[],
  columns: ("type" | "address")[]
): string[][] => {
  const headers = ["Chain ID"];

  if (columns.includes("type")) headers.push("Type");
  if (columns.includes("address")) headers.push("Address");

  const rows = contracts.map((contract) => {
    const baseRow = [contract.chainId.toString()];

    if (columns.includes("type")) baseRow.push(contract.contractType);
    if (columns.includes("address"))
      baseRow.push(formatAddress(contract.addressBytes));

    return baseRow;
  });

  return [headers, ...rows];
};

const main = async (options: ContractsListOptions) => {
  const spinner = options.json
    ? null
    : ora("Fetching contracts from registry...").start();

  try {
    const contracts = await fetchContracts(options.rpc);
    if (!options.json) {
      spinner?.succeed(`Successfully fetched ${contracts.length} contracts`);
    }

    const sortedContracts = [...contracts].sort(
      (a, b) => parseInt(a.chainId.toString()) - parseInt(b.chainId.toString())
    );

    if (options.json) {
      const jsonOutput = sortedContracts.map((c: any) => ({
        chainId: c.chainId.toString(),
        type: c.contractType,
        address: formatAddress(c.addressBytes),
      }));
      console.log(JSON.stringify(jsonOutput, null, 2));
      return;
    }

    if (contracts.length === 0) {
      console.log(chalk.yellow("No contracts found in the registry"));
      return;
    }

    const tableData = formatContractsTable(sortedContracts, options.columns);
    const tableOutput = table(tableData, {
      border: getBorderCharacters("norc"),
    });

    console.log(tableOutput);
  } catch (error) {
    if (!options.json) {
      spinner?.fail("Failed to fetch contracts");
    }
    console.error(chalk.red("Error details:"), error);
  }
};

export const listCommand = new Command("list")
  .alias("l")
  .description("List all contracts from the registry")
  .addOption(
    new Option("--rpc <url>", "Custom RPC URL").default(DEFAULT_EVM_RPC_URL)
  )
  .option("--json", "Output contracts as JSON")
  .addOption(
    new Option("--columns <values...>", "Additional columns to show")
      .choices(["type", "address"])
      .default(["type", "address"])
  )
  .action(async (options: ContractsListOptions) => {
    const validatedOptions = contractsListOptionsSchema.parse(options);
    await main(validatedOptions);
  });
