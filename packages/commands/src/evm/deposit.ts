import confirm from "@inquirer/confirm";
import { Command, Option } from "commander";
import { ethers } from "ethers";

import { readKeyFromStore } from "../../../../utils";
import { hasSufficientBalanceEvm } from "../../../../utils/balances";
import { getChainName, getRpcUrl } from "../../../../utils/chains";
import { ZetaChainClient } from "../../../client/src/client";

const printTransactionDetails = async (
  signer: ethers.Wallet,
  chainId: number,
  options: {
    amount: string;
    callOnRevert: boolean;
    erc20?: string;
    onRevertGasLimit: string;
    receiver: string;
    revertMessage: string;
  }
): Promise<void> => {
  let tokenSymbol = "native tokens";
  if (options.erc20) {
    const erc20Contract = new ethers.Contract(
      options.erc20,
      ["function symbol() view returns (string)"],
      signer.provider
    );
    tokenSymbol = (await erc20Contract.symbol()) as string;
  }

  console.log(`
From:   ${signer.address} on ${getChainName(chainId)}
To:     ${options.receiver} on ZetaChain
Amount: ${options.amount} ${tokenSymbol}${
    !options.callOnRevert ? `\nRefund: ${signer.address}` : ""
  }
Call on revert: ${options.callOnRevert ? "true" : "false"}${
    options.callOnRevert
      ? `\n  Revert Address:      ${signer.address}
  On Revert Gas Limit: ${options.onRevertGasLimit}
  Revert Message:      "${options.revertMessage}"`
      : ""
  }\n`);
};

const main = async (options: {
  amount: string;
  callOnRevert: boolean;
  chainId: string;
  erc20?: string;
  gasLimit: string;
  gasPrice: string;
  gateway?: string;
  key: string;
  keyRaw?: string;
  network: string;
  onRevertGasLimit: string;
  receiver: string;
  revertAddress: string;
  revertMessage: string;
  rpc: string;
  yes: boolean;
}) => {
  try {
    const chainId = parseInt(options.chainId);
    const networkType = options.network;
    const rpcUrl = options.rpc || getRpcUrl(chainId);
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const privateKey = options.keyRaw || readKeyFromStore(options.key);

    let signer;
    try {
      signer = new ethers.Wallet(privateKey, provider);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(
        `Failed to create signer from private key: ${errorMessage}`
      );
    }

    const client = new ZetaChainClient({ network: networkType, signer });

    const { hasEnoughBalance, balance, decimals } =
      await hasSufficientBalanceEvm(
        provider,
        signer,
        options.amount,
        options.erc20
      );

    if (!hasEnoughBalance) {
      throw new Error(
        `Insufficient balance. Required: ${
          options.amount
        }, Available: ${ethers.formatUnits(balance, decimals)}`
      );
    }

    await printTransactionDetails(signer, chainId, {
      amount: options.amount,
      callOnRevert: options.callOnRevert,
      erc20: options.erc20,
      onRevertGasLimit: options.onRevertGasLimit,
      receiver: options.receiver,
      revertMessage: options.revertMessage,
    });

    if (options.yes) {
      console.log("Proceeding with transaction (--yes flag set)");
    } else {
      let confirmed;
      try {
        confirmed = await confirm({
          default: true,
          message: "Proceed with the transaction?",
        });
      } catch (error) {
        console.log("\nTransaction cancelled");
        process.exit(0);
      }

      if (!confirmed) {
        console.log("\nTransaction cancelled");
        process.exit(0);
      }
    }

    const tx = await client.evmDeposit({
      amount: options.amount,
      erc20: options.erc20,
      receiver: options.receiver,
      revertOptions: {
        callOnRevert: options.callOnRevert,
        onRevertGasLimit: options.onRevertGasLimit,
        revertAddress: signer.address,
        revertMessage: options.revertMessage,
      },
      txOptions: {
        gasLimit: options.gasLimit,
        gasPrice: options.gasPrice,
      },
    });
    console.log("Transaction hash:", tx.hash);
  } catch (error) {
    console.error("Error depositing to EVM:", error);
    process.exit(1);
  }
};

export const depositCommand = new Command("deposit")
  .description("Deposit tokens to ZetaChain from an EVM-compatible chain")
  .requiredOption("--amount <amount>", "Amount of tokens to deposit")
  .addOption(
    new Option("--network <network>", "Network to use")
      .choices(["mainnet", "testnet"])
      .default("testnet")
  )
  .requiredOption("--chain-id <chainId>", "Chain ID of the network")
  .requiredOption("--receiver <address>", "Receiver address on ZetaChain")
  .addOption(
    new Option("--key <key>", "Key name to be used from the key store")
      .default("default")
      .conflicts(["key-raw"])
  )
  .addOption(
    new Option(
      "--key-raw <key>",
      "Private key for signing transactions"
    ).conflicts(["key"])
  )
  .option("--rpc <url>", "RPC URL for the source chain")
  .option(
    "--erc20 <address>",
    "ERC20 token address (optional for native token deposits)"
  )
  .option("--gateway <address>", "EVM Gateway address")
  .option(
    "--revert-address <address>",
    "Address to revert to in case of failure (default: signer address)"
  )
  .option(
    "--call-on-revert",
    "Whether to call revert address on failure",
    false
  )
  .option(
    "--on-revert-gas-limit <limit>",
    "Gas limit for revert operation",
    "200000"
  )
  .option("--revert-message <message>", "Message to include in revert", "")
  .option("--gas-limit <limit>", "Gas limit for the transaction")
  .option("--gas-price <price>", "Gas price for the transaction")
  .option("--yes", "Skip confirmation prompt", false)
  .action(main);
