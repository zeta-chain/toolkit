import { PublicKey } from "@solana/web3.js";
import * as bitcoin from "bitcoinjs-lib";
import { ethers } from "ethers";

import { EVMAccountData, SolanaAccountData } from "../types/accounts.types";
import { accountExists, getAccountData } from "./accounts";
import { generateBitcoinAddress } from "./generateBitcoinAddress";

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
  accountName,
  handleError,
}: ResolveEvmAddressArgs): string | undefined => {
  // If valid address provided, return it
  if (evmAddress && isValidEvmAddress(evmAddress)) return evmAddress;

  // Otherwise, try to derive from account name
  if (accountName && accountExists("evm", accountName)) {
    const accountData = getAccountData<EVMAccountData>("evm", accountName);
    if (accountData && accountData.address) {
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
  accountName,
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
    if (accountData && accountData.publicKey) {
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
 * Resolve a Bitcoin address from either a direct input or environment variables
 * @todo: Implement account name resolution and remove the need for environment variables
 */
export const resolveBitcoinAddress = ({
  bitcoinAddress,
  isMainnet = false,
  handleError,
}: ResolveBitcoinAddressArgs): string | undefined => {
  // If valid address provided, return it
  if (bitcoinAddress && isValidBitcoinAddress(bitcoinAddress, isMainnet)) {
    return bitcoinAddress;
  }

  // Otherwise, try to derive from private key
  const btcKey = process.env.BTC_PRIVATE_KEY;
  if (!btcKey) return undefined;

  try {
    const address = generateBitcoinAddress(
      btcKey,
      isMainnet ? "mainnet" : "testnet"
    );
    return address;
  } catch {
    if (handleError) handleError();
    return undefined;
  }
};
