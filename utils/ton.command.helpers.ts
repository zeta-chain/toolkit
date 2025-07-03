import { KeyPair, mnemonicToWalletKey, mnemonicValidate } from "@ton/crypto";
import { Address, WalletContractV4 } from "@ton/ton";
import { Command, Option } from "commander";

import { TONAccountData } from "../types/accounts.types";
import { DEFAULT_ACCOUNT_NAME } from "../types/shared.constants";
import { DEFAULT_ENDPOINT } from "../types/ton.constants";
import { getAccountData } from "./accounts";
import { getAddress } from "./getAddress";
import { handleError } from "./handleError";

export const getAccount = async (options: {
  mnemonic?: string;
  name: string;
}) => {
  const mnemonicRaw =
    options.mnemonic ||
    getAccountData<TONAccountData>("ton", options.name)?.mnemonic;

  if (!mnemonicRaw) {
    const errorMessage = handleError({
      context: "No mnemonic found",
      error: new Error("No mnemonic found"),
      shouldThrow: false,
    });

    throw new Error(errorMessage);
  }

  // Remove extra spaces and newlines
  const mnemonic = mnemonicRaw.trim().replace(/\s+/g, " ");

  const mnemonicWords = mnemonic.split(" ");

  if (!(await mnemonicValidate(mnemonicWords))) {
    throw new Error("Invalid mnemonic phrase");
  }

  const keyPair = await mnemonicToWalletKey(mnemonicWords);

  const wallet = WalletContractV4.create({
    publicKey: keyPair.publicKey,
    workchain: 0,
  });

  const address = wallet.address.toString({
    bounceable: false,
    testOnly: true,
  });

  return {
    address,
    keyPair,
    wallet,
  };
};

export const getWalletAndKeyPair = async (
  wallet?: WalletContractV4,
  keyPair?: KeyPair,
  signer?: string
) => {
  let resolvedWallet: WalletContractV4;
  let resolvedKeyPair: KeyPair;
  if (wallet && keyPair) {
    resolvedWallet = wallet;
    resolvedKeyPair = keyPair;
  } else if (signer) {
    const account = await getAccount({
      mnemonic: signer,
      name: DEFAULT_ACCOUNT_NAME,
    });
    resolvedWallet = account.wallet;
    resolvedKeyPair = account.keyPair;
  } else {
    throw new Error("No wallet or key pair provided");
  }

  return { keyPair: resolvedKeyPair, wallet: resolvedWallet };
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
      "Gateway contract address (default: testnet)"
    )
    .requiredOption("--receiver <receiver>", "Receiver address")
    .option("--rpc <rpc>", "RPC endpoint (default: testnet)", DEFAULT_ENDPOINT)
    .option("--api-key <apiKey>", "API key")
    .requiredOption("--chain-id <chainId>", "Chain ID");
};

export const getGatewayAddress = (
  chainId: string,
  gateway?: string
): Address => {
  const gatewayAddress = getAddress("gateway", Number(chainId));
  if (!gatewayAddress) {
    throw new Error("Gateway address not found");
  }
  return Address.parse(gateway || gatewayAddress);
};
