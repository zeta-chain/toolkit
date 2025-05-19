import { Command, Option } from "commander";

import { DEFAULT_ACCOUNT_NAME } from "../types/shared.constants";
import { chainIds, GAS_BUDGET, networks } from "./sui";

declare module "commander" {
  interface Command {
    addCommonSuiCommandOptions(): Command;
  }
}

Command.prototype.addCommonSuiCommandOptions = function () {
  return this.addOption(
    new Option("--mnemonic <mnemonic>", "Mnemonic for the account").conflicts([
      "private-key",
      "name",
    ])
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
    .option("--coin-type <coinType>", "Coin type to deposit", "0x2::sui::SUI")
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
    );
};
