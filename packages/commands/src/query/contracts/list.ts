import RegistryABI from "@zetachain/protocol-contracts/abi/Registry.sol/Registry.json";
import chalk from "chalk";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import ora from "ora";
import { getBorderCharacters, table } from "table";
import { z } from "zod";

import { CONTRACT_REGISTRY_ADDRESS } from "../../../../../src/constants/addresses";
import { DEFAULT_EVM_RPC_URL } from "../../../../../src/constants/api";
import { contractsListOptionsSchema } from "../../../../../src/schemas/commands/contracts";
import { formatAddress } from "../../../../../utils/addressResolver";

type ContractsListOptions = z.infer<typeof contractsListOptionsSchema>;

interface ContractData {
  addressBytes: string;
  chainId: ethers.BigNumberish;
  contractType: string;
}

const normalizeHex = (hex: string): string =>
  (hex || "").toLowerCase().startsWith("0x")
    ? (hex || "").toLowerCase()
    : `0x${(hex || "").toLowerCase()}`;

const deduplicateContracts = (contracts: ContractData[]): ContractData[] => {
  const seen = new Set<string>();
  const unique: ContractData[] = [];
  for (const c of contracts) {
    const key = `${c.chainId.toString()}::${c.contractType}::${normalizeHex(
      c.addressBytes
    )}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(c);
  }
  return unique;
};

/**
 * For Sui chains (chain IDs 103 and 105), contract addresses are 64 bytes (128 hex chars)
 * representing two concatenated 32-byte values. Split them and display as comma-separated.
 */
const splitSuiCombinedAddress = (bytesHex: string): string => {
  const hex = bytesHex.startsWith("0x") ? bytesHex.slice(2) : bytesHex;
  if (hex.length !== 128) return formatAddress(bytesHex);
  const partA = hex.slice(0, 64);
  const partB = hex.slice(64, 128);
  return `0x${partA}\n0x${partB}`;
};

const formatAddressForChain = (
  bytesHex: string,
  chainId: ethers.BigNumberish
): string => {
  const id = chainId.toString();
  if (id === "103" || id === "105") {
    return splitSuiCombinedAddress(bytesHex);
  }
  return formatAddress(bytesHex);
};

export const fetchContracts = async (
  rpcUrl: string
): Promise<ContractData[]> => {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contractRegistry = new ethers.Contract(
    CONTRACT_REGISTRY_ADDRESS,
    RegistryABI.abi,
    provider
  );

  const contracts =
    (await contractRegistry.getAllContracts()) as ContractData[];
  return contracts;
};

const formatContractsTable = (
  contracts: ContractData[],
  columns: ("type" | "address")[]
): string[][] => {
  const headers = ["Chain ID"];

  if (columns.includes("type")) headers.push("Type");
  if (columns.includes("address")) headers.push("Address");

  const rows = contracts.map((contract) => {
    const baseRow = [contract.chainId.toString()];

    if (columns.includes("type")) baseRow.push(contract.contractType);
    if (columns.includes("address"))
      baseRow.push(
        formatAddressForChain(contract.addressBytes, contract.chainId)
      );

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
    const uniqueContracts = deduplicateContracts(contracts);
    if (!options.json) {
      spinner?.succeed(
        `Successfully fetched ${uniqueContracts.length} contracts`
      );
    }

    const sortedContracts = [...uniqueContracts].sort(
      (a, b) => parseInt(a.chainId.toString()) - parseInt(b.chainId.toString())
    );

    if (options.json) {
      const jsonOutput = sortedContracts.map((c: ContractData) => ({
        address: formatAddressForChain(c.addressBytes, c.chainId),
        chainId: c.chainId.toString(),
        type: c.contractType,
      }));
      console.log(JSON.stringify(jsonOutput, null, 2));
      return;
    }

    if (uniqueContracts.length === 0) {
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
    process.exit(1);
  }
};

export const listCommand = new Command("list")
  .alias("l")
  .summary("List protocol contracts on all connected chains")
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
