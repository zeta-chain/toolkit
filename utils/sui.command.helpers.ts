import { Command, Option } from "commander";

import { DEFAULT_ACCOUNT_NAME } from "../types/shared.constants";
import {
  chainIds,
  GAS_BUDGET,
  networks,
  SUI_DEFAULT_DECIMALS,
  SUI_GAS_COIN_TYPE,
} from "./sui";

export const createSuiCommandWithCommonOptions = (name: string): Command => {
  return new Command(name)
    .addOption(
      new Option("--mnemonic <mnemonic>", "Mnemonic for the account").conflicts(
        ["private-key", "name"]
      )
    )
    .addOption(
      new Option(
        "--private-key <privateKey>",
        "Private key for the account"
      ).conflicts(["mnemonic", "name"])
    )
    .requiredOption("--gateway-object <gatewayObject>", "Gateway object ID")
    .requiredOption("--gateway-package <gatewayPackage>", "Gateway package ID")
    .requiredOption("--receiver <receiver>", "Receiver address on ZetaChain")
    .requiredOption("--amount <amount>", "Amount to deposit in decimal format")
    .addOption(
      new Option("--chain-id <chainId>", "Chain ID")
        .choices(chainIds)
        .default("103")
        .conflicts(["network"])
    )
    .option("--coin-type <coinType>", "Coin type to deposit", SUI_GAS_COIN_TYPE)
    .addOption(
      new Option("--network <network>", "Network to use")
        .choices(networks)
        .conflicts(["chain-id"])
    )
    .option(
      "--gas-budget <gasBudget>",
      "Gas budget in MIST",
      GAS_BUDGET.toString()
    )
    .addOption(
      new Option("--name <name>", "Account name")
        .default(DEFAULT_ACCOUNT_NAME)
        .conflicts(["private-key", "mnemonic"])
    )
    .option(
      "--decimals <number>",
      "Number of decimals for the coin type",
      SUI_DEFAULT_DECIMALS
    );
};
