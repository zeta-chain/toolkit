import chalk from "chalk";
import { Command, Option } from "commander";
import { ethers } from "ethers";
import ora from "ora";

import { STAKING_PRECOMPILE } from "../../../../../src/constants/addresses";
import { DEFAULT_EVM_RPC_URL } from "../../../../../src/constants/api";
import stakingArtifact from "../staking.json";

const STAKING_ABI = (stakingArtifact as { abi: unknown })
  .abi as ethers.InterfaceAbi;

const main = async (opts: {
  address: string;
  json?: boolean;
  rpc: string;
  validator: string;
}) => {
  const spinner = opts.json ? null : ora("Fetching delegation...").start();
  try {
    const provider = new ethers.JsonRpcProvider(opts.rpc);
    const contract = new ethers.Contract(
      STAKING_PRECOMPILE,
      STAKING_ABI,
      provider
    );
    const [shares, balance] = (await contract.delegation(
      opts.address,
      opts.validator
    )) as [bigint, { amount: bigint; denom: string }];

    const result = {
      address: opts.address,
      balance: balance?.amount?.toString?.() ?? "0",
      denom: balance?.denom ?? "-",
      shares: shares.toString(),
      validator: opts.validator,
    };

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      spinner?.succeed("Fetched delegation");
      console.log(`Delegator: ${result.address}`);
      console.log(`Validator: ${result.validator}`);
      console.log(`Shares: ${result.shares}`);
      console.log(
        `Balance: ${ethers.formatUnits(BigInt(result.balance), 18)} ZETA`
      );
    }
  } catch (error) {
    spinner?.fail("Failed to fetch delegation");
    console.error(chalk.red("Error details:"), error);
  }
};

export const showCommand = new Command("show")
  .description("Show a delegation by delegator and validator")
  .addOption(
    new Option(
      "--address <address>",
      "EVM address of the delegator"
    ).makeOptionMandatory()
  )
  .addOption(
    new Option(
      "--validator <address>",
      "Validator operator address (hex or bech32)"
    ).makeOptionMandatory()
  )
  .addOption(
    new Option("--rpc <url>", "RPC endpoint URL").default(DEFAULT_EVM_RPC_URL)
  )
  .addOption(new Option("--json", "Output as JSON"))
  .action(
    async (raw: {
      address: string;
      json?: boolean;
      rpc: string;
      validator: string;
    }) => {
      await main(raw);
    }
  );
