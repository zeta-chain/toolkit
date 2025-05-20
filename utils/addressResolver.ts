import { PublicKey } from "@solana/web3.js";
import * as bitcoin from "bitcoinjs-lib";
import { ethers } from "ethers";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

import {
  BitcoinAccountData,
  EVMAccountData,
  SolanaAccountData,
  SuiAccountData,
} from "../types/accounts.types";
import { DEFAULT_ACCOUNT_NAME } from "../types/shared.constants";
import { accountExists, getAccountData } from "./accounts";

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
  try {
    // Sui addresses are 32 bytes (64 hex chars) prefixed with 0x
    return /^0x[a-fA-F0-9]{64}$/.test(address);
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
  /** A Sui address to validate */
  suiAddress?: string;
  /** Function to handle errors */
  handleError?: () => void;
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
