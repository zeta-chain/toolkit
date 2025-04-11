import { Command } from "commander";
import { ethers } from "ethers";

import { ZetaChainClient } from "../../client/src/client";
import { evmDeposit } from "../../client/src/evmDeposit";

const main = async (options: {
  amount: string;
  erc20?: string;
  gateway?: string;
  receiver: string;
  revertAddress: string;
  callOnRevert: boolean;
  onRevertGasLimit: string;
  revertMessage: string;
  gasLimit: string;
  gasPrice: string;
  network: string;
  privateKey: string;
  rpc: string;
}) => {
  try {
    const provider = new ethers.JsonRpcProvider(options.rpc);
    const signer = new ethers.Wallet(options.privateKey, provider);
    const client = new ZetaChainClient({ network: options.network, signer });
    const tx = await evmDeposit.call(client, {
      amount: options.amount,
      erc20: options.erc20,
      receiver: options.receiver,
      revertOptions: {
        revertAddress: options.revertAddress,
        callOnRevert: options.callOnRevert,
        onRevertGasLimit: options.onRevertGasLimit,
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

export const evmDepositCommand = new Command("evm-deposit")
  .description("Deposit tokens to ZetaChain from an EVM-compatible chain")
  .requiredOption("--amount<amount>", "Amount of tokens to deposit")
  .requiredOption(
    "--network <network>",
    "Network to use (e.g., testnet, mainnet)"
  )
  .requiredOption("--receiver <address>", "Receiver address on ZetaChain")
  .requiredOption("--private-key <key>", "Private key for signing transactions")
  .requiredOption("--rpc <url>", "RPC URL for the source chain")
  .option(
    "--erc20 <address>",
    "ERC20 token address (optional for native token deposits)"
  )
  .option("--gateway <address>", "EVM Gateway address")
  .option(
    "--revert-address <address>",
    "Address to revert to in case of failure"
  )
  .option(
    "--call-on-revert",
    "Whether to call revert address on failure",
    false
  )
  .option("--on-revert-gas-limit <limit>", "Gas limit for revert operation")
  .option("--revert-message <message>", "Message to include in revert")
  .option("--gas-limit <limit>", "Gas limit for the transaction")
  .option("--gas-price <price>", "Gas price for the transaction")
  .action(main);
