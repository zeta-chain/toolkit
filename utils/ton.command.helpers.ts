import { mnemonicToWalletKey } from "@ton/crypto";
import { WalletContractV4 } from "@ton/ton";
import { Command, Option } from "commander";

import { TONAccountData } from "../types/accounts.types";
import { DEFAULT_ACCOUNT_NAME } from "../types/shared.constants";
import { DEFAULT_ENDPOINT, DEFAULT_GATEWAY_ADDR } from "../types/ton.constants";
import { getAccountData } from "./accounts";
import { handleError } from "./handleError";

export const getAccount = async (options: {
  mnemonic?: string;
  name: string;
}) => {
  const mnemonic =
    options.mnemonic ||
    getAccountData<TONAccountData>("ton", options.name)?.mnemonic;

  if (!mnemonic) {
    const errorMessage = handleError({
      context: "No mnemonic found",
      error: new Error("No mnemonic found"),
      shouldThrow: false,
    });

    throw new Error(errorMessage);
  }

  const keyPair = await mnemonicToWalletKey(mnemonic.split(" "));

  const wallet = WalletContractV4.create({
    publicKey: keyPair.publicKey,
    workchain: 0,
  });

  return {
    keyPair,
    wallet,
  };
};

export const createTonCommandWithCommonOptions = (name: string): Command => {
  return new Command(name)
    .addOption(
      new Option("--mnemonic <mnemonic>", "Mnemonic for the account").conflicts(
        ["private-key", "name"]
      )
    )
    .addOption(
      new Option("--name <name>", "Name of the account")
        .default(DEFAULT_ACCOUNT_NAME)
        .conflicts(["mnemonic"])
    )
    .option(
      "--gateway <gateway>",
      "Gateway contract address (default: testnet)",
      DEFAULT_GATEWAY_ADDR
    )
    .requiredOption("--receiver <receiver>", "Receiver address")
    .option("--rpc <rpc>", "RPC endpoint (default: testnet)", DEFAULT_ENDPOINT)
    .option("--api-key <apiKey>", "API key");
};
