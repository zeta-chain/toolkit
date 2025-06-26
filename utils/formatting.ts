import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { ethers } from "ethers";

import { TokenBalance } from "../types/balances.types";
import { CCTX } from "../types/trackCCTX.types";
import { handleError } from "./handleError";

/**
 * Create a shortened hash representation for better readability
 */
export const shortenHash = (hash: string): string => {
  if (!hash || hash.length === 0) {
    return "";
  }

  // For short hashes, just return the original
  if (hash.length <= 10) {
    return hash;
  }

  const start = hash.substring(0, 10);
  const end = hash.substring(hash.length - 8);
  return `${start}...${end}`;
};

/**
 * Format the status text with optional status message
 */
export const formatStatusText = (tx: CCTX): string => {
  if (!tx) return "";
  return `${tx.status || "Unknown"}${
    tx.status_message ? ` (${tx.status_message})` : ""
  }`;
};

/**
 * Format wallet addresses into a readable string
 */
export interface FormatAddressesOptions {
  bitcoin?: string;
  evm?: string;
  solana?: string;
  sui?: string;
  ton?: string;
}

export const formatAddresses = (options: FormatAddressesOptions): string => {
  const parts = [];

  if (options.evm) {
    const evmStr = `EVM: \x1b[96m${options.evm}\x1b[0m`;
    parts.push(evmStr);
  }

  if (options.bitcoin) {
    const btcStr = `Bitcoin: \x1b[91m${options.bitcoin}\x1b[0m`;
    parts.push(btcStr);
  }

  if (options.solana) {
    const solanaStr = `Solana: \x1b[35m${options.solana}\x1b[0m`;
    parts.push(solanaStr);
  }

  if (options.sui) {
    const suiStr = `Sui: \x1b[36m${options.sui}\x1b[0m`;
    parts.push(suiStr);
  }

  if (options.ton) {
    const tonStr = `TON: \x1b[94m${options.ton}\x1b[0m`;
    parts.push(tonStr);
  }

  return parts.join("\n");
};

/**
 * Normalize a float string by removing unnecessary zeros
 */
export const normalizeFloat = (str: string): string => {
  const num = Number(str);
  if (!Number.isFinite(num)) {
    throw new Error(`'${str}' is not a valid number`);
  }
  return num.toString(); // drops unnecessary zeros
};

/**
 * Format token balances for display
 */
export interface FormattedBalance {
  Amount: string;
  Chain: string;
  Token: string;
  Type: string;
}

export const formatBalances = (
  balances: TokenBalance[]
): FormattedBalance[] => {
  const sortedBalances = [...balances].sort((a, b) => {
    if (!a.chain_name && !b.chain_name) return 0;
    if (!a.chain_name) return 1;
    if (!b.chain_name) return -1;

    // First sort by chain name
    const chainCompare = a.chain_name.localeCompare(b.chain_name);
    if (chainCompare !== 0) return chainCompare;

    // Then by balance (descending)
    return parseFloat(b.balance) - parseFloat(a.balance);
  });

  return sortedBalances.map((balance) => ({
    Amount: normalizeFloat(parseFloat(balance.balance).toFixed(6)),
    Chain: balance.chain_name || "Unknown",
    Token: balance.symbol,
    Type: balance.coin_type,
  }));
};

/**
 * Prints the details of an EVM transaction to the console
 */
export const printEvmTransactionDetails = async (
  signer: ethers.Wallet,
  options: {
    amount?: string;
    callOnRevert: boolean;
    erc20?: string;
    onRevertGasLimit: string;
    receiver: string;
    revertMessage: string;
  }
): Promise<void> => {
  let tokenSymbol = "native tokens";
  if (options.erc20) {
    try {
      const erc20Contract = new ethers.Contract(
        options.erc20,
        ERC20_ABI.abi,
        signer.provider
      );
      tokenSymbol = (await erc20Contract.symbol()) as string;
    } catch (error) {
      handleError({
        context: "Could not fetch token symbol",
        error,
        shouldThrow: false,
      });
      tokenSymbol = "ERC20 tokens";
    }
  }

  console.log(`
From:   ${signer.address}
To:     ${options.receiver} on ZetaChain${
    options.amount
      ? `\nAmount: ${options.amount} ${tokenSymbol}${
          !options.callOnRevert ? `\nRefund: ${signer.address}` : ""
        }`
      : ""
  }
Call on revert: ${options.callOnRevert ? "true" : "false"}${
    options.callOnRevert
      ? `\n  Revert Address:      ${signer.address}
  On Revert Gas Limit: ${options.onRevertGasLimit}
  Revert Message:      "${options.revertMessage}"`
      : ""
  }\n`);
};
