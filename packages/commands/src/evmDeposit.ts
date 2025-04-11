import { Command } from "commander";
import { ethers } from "ethers";
import { networks } from "@zetachain/networks";
import { type NetworksSchema } from "@zetachain/networks/dist/src/types";

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
  keyRaw: string;
  rpc: string;
}) => {
  try {
    const chainId = parseInt(options.network);
    const networkType = getNetworkType(chainId);
    const rpcUrl = options.rpc || getRpcUrl(chainId);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    let signer;
    try {
      signer = new ethers.Wallet(options.keyRaw, provider);
    } catch (error: any) {
      throw new Error(
        `Failed to create signer from private key: ${error.message}`
      );
    }
    const client = new ZetaChainClient({ network: networkType, signer });
    const tx = await client.evmDeposit({
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

export const evmDepositCommand = new Command("evm-deposit")
  .description("Deposit tokens to ZetaChain from an EVM-compatible chain")
  .requiredOption("--amount <amount>", "Amount of tokens to deposit")
  .requiredOption("--network <network>", "Chain ID of the network")
  .requiredOption("--receiver <address>", "Receiver address on ZetaChain")
  .requiredOption("--key-raw <key>", "Private key for signing transactions")
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
