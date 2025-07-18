import chalk from "chalk";
import { Command } from "commander";
import ora from "ora";
import { ethers } from "ethers";
import { z } from "zod";
import { getBorderCharacters, table } from "table";
import RegistryABI from "@zetachain/protocol-contracts/abi/Registry.sol/Registry.json";
import { DEFAULT_EVM_RPC_URL } from "../../../../src/constants/api";

const contractsOptionsSchema = z.object({
  json: z.boolean().default(false),
  rpc: z.string().default(DEFAULT_EVM_RPC_URL),
});

type ContractsOptions = z.infer<typeof contractsOptionsSchema>;

const CONTRACT_REGISTRY_ADDRESS = "0x7cce3eb018bf23e1fe2a32692f2c77592d110394";

/**
 * Attempts to extract and checksum‑encode a valid 20‑byte EVM address from the
 * supplied bytes‑hex string. If none can be found, returns `null`.
 */
const tryParseEvmAddress = (bytesHex: string): string | null => {
  const clean = bytesHex.toLowerCase();

  // Case 1 – value is already a 20‑byte address (0x + 40 hex chars)
  if (clean.length === 42 && ethers.isAddress(clean)) {
    return ethers.getAddress(clean);
  }

  // Case 2 – value is a left‑padded bytes32: slice last 40 hex chars
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

const main = async (options: ContractsOptions) => {
  const spinner = ora("Connecting to network...").start();

  try {
    spinner.text = "Connecting to contract registry...";
    const provider = new ethers.JsonRpcProvider(options.rpc);
    const contractRegistry = new ethers.Contract(
      CONTRACT_REGISTRY_ADDRESS,
      RegistryABI.abi,
      provider
    );

    spinner.text = "Querying contract registry...";
    const contracts = await contractRegistry.getAllContracts();

    spinner.succeed("Successfully fetched contracts");

    if (options.json) {
      // Map and format before JSON output for consistency
      const jsonOutput = contracts.map((c: any) => ({
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

    const tableData = [
      ["Chain ID", "Type", "Address"],
      ...contracts.map((contract: any) => [
        contract.chainId.toString(),
        contract.contractType,
        formatAddress(contract.addressBytes),
      ]),
    ];

    const tableConfig = {
      border: getBorderCharacters("norc"),
      columnDefault: {
        alignment: "left" as const,
      },
      columns: [
        { alignment: "center" as const },
        { alignment: "left" as const },
        { alignment: "left" as const },
      ],
    };

    console.log(table(tableData, tableConfig));
  } catch (error) {
    spinner.fail("Failed to fetch contracts");
    console.error(chalk.red("Error details:"), error);
  }
};

export const contractsCommand = new Command("contracts")
  .summary("Query the contract registry and display all contracts")
  .option("--rpc <url>", "Custom RPC URL", DEFAULT_EVM_RPC_URL)
  .option("--json", "Output contracts as JSON")
  .action(async (options: ContractsOptions) => {
    const validatedOptions = contractsOptionsSchema.parse(options);
    await main(validatedOptions);
  });
