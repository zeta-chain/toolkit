import chalk from "chalk";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import { z } from "zod";

import { DEFAULT_EVM_RPC_URL } from "../../../../../src/constants/api";
import { contractsShowOptionsSchema } from "../../../../../src/schemas/commands/contracts";
import { formatAddress } from "../../../../../utils/addressResolver";
import { fetchContracts } from "./list";

type ContractsShowOptions = z.infer<typeof contractsShowOptionsSchema>;

interface ContractData {
  addressBytes: string;
  chainId: ethers.BigNumberish;
  contractType: string;
}

/**
 * For Sui chains (chain IDs 103 and 105), contract addresses are 64 bytes (128 hex chars)
 * representing two concatenated 32-byte values. Split them and display newline-separated.
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

const findContractByChainId = (
  contracts: ContractData[],
  chainId: string,
  type: string
): ContractData | null => {
  const matchingContracts = contracts.filter(
    (contract) => contract.chainId.toString() === chainId
  );

  return (
    matchingContracts.find(
      (contract) => contract.contractType.toLowerCase() === type.toLowerCase()
    ) || null
  );
};

const main = async (options: ContractsShowOptions) => {
  try {
    const contracts = await fetchContracts(options.rpc);

    const contract = findContractByChainId(
      contracts,
      options.chainId,
      options.type
    );

    if (!contract) {
      console.error(
        chalk.red(
          `Contract on chain '${options.chainId}' with type '${options.type}' not found`
        )
      );
      console.log(chalk.yellow("Available contracts:"));
      const availableContracts = contracts
        .map((c) => `${c.chainId.toString()}:${c.contractType}`)
        .sort();
      console.log(availableContracts.join(", "));
      process.exit(1);
    }

    const address = formatAddressForChain(
      contract.addressBytes,
      contract.chainId
    );
    console.log(address);
  } catch (error) {
    console.error(chalk.red("Error details:"), error);
    process.exit(1);
  }
};

export const showCommand = new Command("show")
  .alias("s")
  .summary("Show a protocol contract address on a specific chain")
  .addOption(
    new Option("--rpc <url>", "Custom RPC URL").default(DEFAULT_EVM_RPC_URL)
  )
  .addOption(
    new Option("--chain-id -c <chainId>", "Chain ID").makeOptionMandatory()
  )
  .addOption(
    new Option("--type -t <type>", "Contract type").makeOptionMandatory()
  )
  .action(async (options: ContractsShowOptions) => {
    const validatedOptions = contractsShowOptionsSchema.parse(options);
    await main(validatedOptions);
  });
