import { networks } from "@zetachain/networks";
import { type NetworksSchema } from "@zetachain/networks/dist/src/types";
import { Command, Option } from "commander";
import { ethers } from "ethers";

import { readKeyFromStore } from "../../../../utils";
import { ZetaChainClient } from "../../../client/src/client";

const main = async (options: {
  amount: string;
  callOnRevert: boolean;
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
}) => {
  try {
    const chainId = parseInt(options.network);
    const networkType = getNetworkType(chainId);
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
    const tx = await client.evmDeposit({
      amount: options.amount,
      erc20: options.erc20,
      receiver: options.receiver,
      revertOptions: {
        callOnRevert: options.callOnRevert,
        onRevertGasLimit: options.onRevertGasLimit,
        revertAddress: options.revertAddress,
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

const getNetworkType = (chainId: number): "testnet" | "mainnet" => {
  const typedNetworks = networks as NetworksSchema;
  const network = Object.values(typedNetworks).find(
    (n) => n.chain_id === chainId
  );

  if (!network) {
    throw new Error(`Network with chain ID ${chainId} not found`);
  }

  return network.type;
};

const getRpcUrl = (chainId: number): string => {
  const typedNetworks = networks as NetworksSchema;
  const network = Object.values(typedNetworks).find(
    (n) => n.chain_id === chainId
  );

  if (!network) {
    throw new Error(`Network with chain ID ${chainId} not found`);
  }

  if (!network.api) {
    throw new Error(`Network with chain ID ${chainId} has no API endpoints`);
  }

  const evmRpc = network.api.find((api) => api.type === "evm");
  if (!evmRpc) {
    throw new Error(`Network with chain ID ${chainId} has no EVM RPC endpoint`);
  }

  return evmRpc.url;
};

export const depositCommand = new Command("deposit")
  .description("Deposit tokens to ZetaChain from an EVM-compatible chain")
  .requiredOption("--amount <amount>", "Amount of tokens to deposit")
  .requiredOption("--network <network>", "Chain ID of the network")
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
    "Address to revert to in case of failure",
    ethers.ZeroAddress
  )
  .option(
    "--call-on-revert",
    "Whether to call revert address on failure",
    false
  )
  .option(
    "--on-revert-gas-limit <limit>",
    "Gas limit for revert operation",
    "0"
  )
  .option("--revert-message <message>", "Message to include in revert", "")
  .option("--gas-limit <limit>", "Gas limit for the transaction")
  .option("--gas-price <price>", "Gas price for the transaction")
  .action(main);
