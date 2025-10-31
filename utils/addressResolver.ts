import { PublicKey } from "@solana/web3.js";
import { Address } from "@ton/core";
import * as bitcoin from "bitcoinjs-lib";
import { ethers } from "ethers";

import {
  BitcoinAccountData,
  EVMAccountData,
  SolanaAccountData,
  SuiAccountData,
  TONAccountData,
} from "../types/accounts.types";
import { DEFAULT_ACCOUNT_NAME } from "../types/shared.constants";
import { accountExists, getAccountData } from "./getAccountData";

/**
 * Check if a string is a valid EVM address
 */
const isValidEvmAddress = (address?: string): boolean => {
  if (!address) return false;
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

/**
 * Check if a string is a valid Solana address
 */
const isValidSolanaAddress = (address?: string): boolean => {
  if (!address) return false;
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

/**
 * Proper validation of Bitcoin address using bitcoinjs-lib
 */
const isValidBitcoinAddress = (
  address?: string,
  isMainnet = false
): boolean => {
  if (!address) return false;

  try {
    const network = isMainnet
      ? bitcoin.networks.bitcoin
      : bitcoin.networks.testnet;

    // Try to decode the address - will throw if invalid
    bitcoin.address.toOutputScript(address, network);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if a string is a valid Sui address
 */
const isValidSuiAddress = (address?: string): boolean => {
  if (!address) return false;
  // Sui addresses are 1-64 hex chars prefixed with 0x
  return /^0x[a-fA-F0-9]{1,64}$/.test(address);
};

/**
 * Check if a string is a valid TON address
 */
const isValidTonAddress = (address?: string): boolean => {
  if (!address) return false;
  try {
    Address.parse(address);
    return true;
  } catch {
    return false;
  }
};

/**
 * Args for resolving an EVM address
 */
export interface ResolveEvmAddressArgs {
  /** Account name to use if address not provided */
  accountName?: string;
  /** An EVM address to validate */
  evmAddress?: string;
  /** Function to handle errors */
  handleError?: () => void;
}

/**
 * Resolve an EVM address from either a direct input or account name
 */
export const resolveEvmAddress = ({
  evmAddress,
  accountName = DEFAULT_ACCOUNT_NAME,
  handleError,
}: ResolveEvmAddressArgs): string | undefined => {
  // If valid address provided, return it
  if (evmAddress && isValidEvmAddress(evmAddress)) return evmAddress;

  // Otherwise, try to derive from account name
  if (accountName && accountExists("evm", accountName)) {
    const accountData = getAccountData<EVMAccountData>("evm", accountName);
    if (accountData?.address) {
      return accountData.address;
    }
  }

  // Handle error if no valid address found
  if (handleError) handleError();
  return undefined;
};

/**
 * Args for resolving a Solana address
 */
export interface ResolveSolanaAddressArgs {
  /** Account name to use if address not provided */
  accountName?: string;
  /** Function to handle errors */
  handleError?: () => void;
  /** A Solana address to validate */
  solanaAddress?: string;
}

/**
 * Resolve a Solana address from either a direct input or account name
 */
export const resolveSolanaAddress = ({
  solanaAddress,
  accountName = DEFAULT_ACCOUNT_NAME,
  handleError,
}: ResolveSolanaAddressArgs): string | undefined => {
  // If valid address provided, return it
  if (solanaAddress && isValidSolanaAddress(solanaAddress))
    return solanaAddress;

  // Otherwise, try to derive from account name
  if (accountName && accountExists("solana", accountName)) {
    const accountData = getAccountData<SolanaAccountData>(
      "solana",
      accountName
    );
    if (accountData?.publicKey) {
      return accountData.publicKey;
    }
  }

  // Handle error if no valid address found
  if (handleError) handleError();
  return undefined;
};

/**
 * Args for resolving a Bitcoin address
 */
export interface ResolveBitcoinAddressArgs {
  /** Account name to use if address not provided */
  accountName?: string;
  /** A Bitcoin address to validate */
  bitcoinAddress?: string;
  /** Function to handle errors */
  handleError?: () => void;
  /** Whether to use mainnet or testnet */
  isMainnet?: boolean;
}

/**
 * Resolve a Bitcoin address from a direct input or account name
 */
export const resolveBitcoinAddress = ({
  bitcoinAddress,
  accountName = DEFAULT_ACCOUNT_NAME,
  isMainnet = false,
  handleError,
}: ResolveBitcoinAddressArgs): string | undefined => {
  // If valid address provided, return it
  if (bitcoinAddress && isValidBitcoinAddress(bitcoinAddress, isMainnet)) {
    return bitcoinAddress;
  }

  // Check if we have an account name
  if (accountName && accountExists("bitcoin", accountName)) {
    // Try to get the account data
    const accountData = getAccountData<BitcoinAccountData>(
      "bitcoin",
      accountName
    );

    if (accountData) {
      // Return the appropriate address based on the network flag
      return isMainnet
        ? accountData.mainnetAddress
        : accountData.testnetAddress;
    }
  }

  if (handleError) handleError();
  return undefined;
};

/**
 * Args for resolving a Sui address
 */
export interface ResolveSuiAddressArgs {
  /** Account name to use if address not provided */
  accountName?: string;
  /** Function to handle errors */
  handleError?: () => void;
  /** A Sui address to validate */
  suiAddress?: string;
}

/**
 * Resolve a Sui address from either a direct input or account name
 */
export const resolveSuiAddress = ({
  suiAddress,
  accountName = DEFAULT_ACCOUNT_NAME,
  handleError,
}: ResolveSuiAddressArgs): string | undefined => {
  // If valid address provided, return it
  if (suiAddress && isValidSuiAddress(suiAddress)) return suiAddress;

  // Otherwise, try to derive from account name
  if (accountName && accountExists("sui", accountName)) {
    const accountData = getAccountData<SuiAccountData>("sui", accountName);
    if (accountData?.address) {
      return accountData.address;
    }
  }

  // Handle error if no valid address found
  if (handleError) handleError();
  return undefined;
};

/**
 * Args for resolving a TON address
 */
export interface ResolveTonAddressArgs {
  /** Account name to use if address not provided */
  accountName?: string;
  /** Function to handle errors */
  handleError?: () => void;
  /** A TON address to validate */
  tonAddress?: string;
}

/**
 * Resolve a TON address from either a direct input or account name
 */
export const resolveTONAddress = ({
  tonAddress,
  accountName = DEFAULT_ACCOUNT_NAME,
  handleError,
}: ResolveTonAddressArgs): string | undefined => {
  // If valid address provided, return it
  if (tonAddress && isValidTonAddress(tonAddress)) return tonAddress;

  // Otherwise, try to derive from account name
  if (accountName && accountExists("ton", accountName)) {
    const accountData = getAccountData<TONAccountData>("ton", accountName);
    if (accountData?.address) {
      return accountData.address;
    }
  }

  // Handle error if no valid address found
  if (handleError) handleError();
  return undefined;
};

/**
 * Attempts to extract and checksum‑encode a valid 20‑byte EVM address from the
 * supplied bytes‑hex string. If none can be found, returns `null`.
 */
export const tryParseEvmAddress = (bytesHex: string): string | null => {
  const clean = bytesHex.toLowerCase();

  // Case 1 – value is already a 20‑byte address (0x + 40 hex chars)
  if (clean.length === 42 && ethers.isAddress(clean)) {
    return ethers.getAddress(clean);
  }

  // Case 2 – value is a left‑padded bytes32: slice last 40 hex chars
  if (clean.length === 66) {
    const potential = `0x${clean.slice(-40)}`;
    if (ethers.isAddress(potential)) {
      return ethers.getAddress(potential);
    }
  }

  return null;
};

/**
 * Formats a bytes‑hex string as either an EVM address or ASCII text.
 * First attempts to parse as an EVM address, then falls back to ASCII decoding.
 */
export const formatAddress = (bytesHex: string): string => {
  const evmAddress = tryParseEvmAddress(bytesHex);
  if (evmAddress) {
    return evmAddress;
  }

  // Decode as ASCII if not an address
  try {
    const decoded = ethers.toUtf8String(bytesHex);
    // Remove null bytes from the end
    return decoded.replace(/\0+$/, "");
  } catch {
    return bytesHex;
  }
};

/**
 * For Sui chains (chain IDs 103 and 105), contract addresses are 64 bytes (128 hex chars)
 * representing two concatenated 32-byte values. Split them and display on separate lines.
 */
export const splitSuiCombinedAddress = (bytesHex: string): string => {
  const hex = bytesHex.startsWith("0x") ? bytesHex.slice(2) : bytesHex;
  if (hex.length !== 128) return formatAddress(bytesHex);
  const partA = hex.slice(0, 64);
  const partB = hex.slice(64, 128);
  return `0x${partA}\n0x${partB}`;
};

/**
 * Formats an address based on the chain ID, applying chain-specific formatting rules.
 * For Sui chains (103, 105), splits combined addresses; otherwise uses standard formatting.
 */
export const formatAddressForChain = (
  bytesHex: string,
  chainId: ethers.BigNumberish
): string => {
  const id = chainId.toString();
  if (id === "103" || id === "105") {
    return splitSuiCombinedAddress(bytesHex);
  }
  return formatAddress(bytesHex);
};
