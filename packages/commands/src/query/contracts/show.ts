import chalk from "chalk";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import { z } from "zod";

import { DEFAULT_EVM_RPC_URL } from "../../../../../src/constants/api";
import { contractsShowOptionsSchema } from "../../../../../src/schemas/commands/contracts";
import { formatAddress } from "../../../../../utils/addressResolver";
import { fetchContracts } from "./list";

type ContractsShowOptions = z.infer<typeof contractsShowOptionsSchema>;

const findContractByChainId = (
  contracts: any[],
  chainId: string,
  type: string
): any | null => {
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

    const address = formatAddress(contract.addressBytes);
    console.log(address);
  } catch (error) {
    console.error(chalk.red("Error details:"), error);
  }
};

export const showCommand = new Command("show")
  .alias("s")
  .description("Show contract address for a specific chain and type")
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
