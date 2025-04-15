import { Keypair, PublicKey } from "@solana/web3.js";
import * as bitcoin from "bitcoinjs-lib";
import bs58 from "bs58";
import { ethers } from "ethers";

import { numberArraySchema } from "../types/shared.schema";
import { generateBitcoinAddress } from "./generateBitcoinAddress";
import { parseJson } from "./parseJson";

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
  /** An EVM address to validate */
  evmAddress?: string;
  /** Function to handle errors */
  handleError?: () => void;
}

/**
 * Resolve an EVM address from either a direct input or environment variables
 */
export const resolveEvmAddress = ({
  evmAddress,
  handleError,
}: ResolveEvmAddressArgs): string | undefined => {
  // If valid address provided, return it
  if (evmAddress && isValidEvmAddress(evmAddress)) return evmAddress;

  // Otherwise, try to derive from private key
  const evmKey = process.env.EVM_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!evmKey) return undefined;

  try {
    return new ethers.Wallet(evmKey).address;
  } catch {
    if (handleError) handleError();
    return undefined;
  }
};

/**
 * Args for resolving a Solana address
 */
export interface ResolveSolanaAddressArgs {
  /** Function to handle errors */
  handleError?: () => void;
  /** A Solana address to validate */
  solanaAddress?: string;
}

/**
 * Resolve a Solana address from either a direct input or environment variables
 */
export const resolveSolanaAddress = ({
  solanaAddress,
  handleError,
}: ResolveSolanaAddressArgs): string | undefined => {
  // If valid address provided, return it
  if (solanaAddress && isValidSolanaAddress(solanaAddress))
    return solanaAddress;

  // Otherwise, try to derive from private key
  const solanaKey = process.env.SOLANA_PRIVATE_KEY;
  if (!solanaKey) return undefined;

  try {
    if (solanaKey.startsWith("[") && solanaKey.endsWith("]")) {
      const parsedKey = parseJson(solanaKey, numberArraySchema);
      return Keypair.fromSecretKey(
        Uint8Array.from(parsedKey)
      ).publicKey.toString();
    } else {
      return Keypair.fromSecretKey(bs58.decode(solanaKey)).publicKey.toString();
    }
  } catch {
    if (handleError) handleError();
    return undefined;
  }
};

/**
 * Args for resolving a Bitcoin address
 */
export interface ResolveBitcoinAddressArgs {
  /** A Bitcoin address to validate */
  bitcoinAddress?: string;
  /** Function to handle errors */
  handleError?: () => void;
  /** Whether to use mainnet or testnet */
  isMainnet?: boolean;
}

/**
 * Resolve a Bitcoin address from either a direct input or environment variables
 */
export const resolveBitcoinAddress = ({
  bitcoinAddress,
  isMainnet = false,
  handleError,
}: ResolveBitcoinAddressArgs): string | undefined => {
  // If valid address provided, return it
  if (bitcoinAddress && isValidBitcoinAddress(bitcoinAddress, isMainnet))
    return bitcoinAddress;

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
