import { bech32 } from "bech32";
import { ethers } from "ethers";

export const ZETA_HRP = "zeta";
export const ZETA_VALOPER_HRP = "zetavaloper";
export const ZETA_VALCONS_HRP = "zetavalcons";

export const isHexAddress = (value: string): boolean => {
  try {
    const candidate = value.startsWith("0x") ? value : `0x${value}`;
    return ethers.isAddress(candidate);
  } catch {
    return false;
  }
};

export const isBech32Address = (value: string): boolean => {
  try {
    const decoded = bech32.decode(value);
    return (
      !!decoded && Array.isArray(decoded.words) && decoded.words.length > 0
    );
  } catch {
    return false;
  }
};

export const hexToBech32 = (
  hexAddr: string,
  hrp: string = ZETA_HRP
): string => {
  const checksumAddress = ethers.getAddress(hexAddr);
  const addressBytes = ethers.getBytes(checksumAddress);
  const words = bech32.toWords(Buffer.from(addressBytes));
  return bech32.encode(hrp, words);
};

export const bech32ToHex = (bech32Addr: string): string => {
  const decoded = bech32.decode(bech32Addr);
  const bytes = Buffer.from(bech32.fromWords(decoded.words));
  if (bytes.length !== 20) {
    throw new Error(
      `Invalid address bytes length ${bytes.length}, expected 20`
    );
  }
  const hex = `0x${bytes.toString("hex")}`;
  return ethers.getAddress(hex);
};

/**
 * Try to parse a string that contains a decimal byte array in square brackets
 * e.g. "[73 85 163 ...]" or "Address: [73, 85, 163, ...]".
 * Returns an array of numbers if successful, otherwise null.
 */
const tryParseByteArrayString = (value: string): number[] | null => {
  const start = value.indexOf("[");
  const end = value.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  const inner = value.slice(start + 1, end);
  const parts = inner
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) return null;
  const numbers: number[] = [];
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    numbers.push(n);
  }
  if (numbers.length !== 20) return null;
  return numbers;
};

/**
 * Normalize any supported address input into a 20-byte array.
 * Supports: 0x hex, hex without 0x, bech32 (any zeta* HRP), and decimal byte array strings.
 */
const parseAddressInput = (input: string): Uint8Array => {
  const value = input.trim();

  if (isHexAddress(value)) {
    const checksum = ethers.getAddress(
      value.startsWith("0x") ? value : `0x${value}`
    );
    return Uint8Array.from(ethers.getBytes(checksum));
  }

  if (isBech32Address(value)) {
    const hex = bech32ToHex(value);
    return Uint8Array.from(ethers.getBytes(hex));
  }

  const bytesArray = tryParseByteArrayString(value);
  if (bytesArray) {
    return Uint8Array.from(bytesArray);
  }

  throw new Error(
    "Unsupported address format. Provide hex (0x... or without 0x), bech32, or a [..] byte array."
  );
};

export interface UnifiedAddressFormats {
  bech32Acc: string;
  bech32Valcons: string;
  bech32Valoper: string;
  bytes: number[];
  // EIP-55 checksummed address with 0x prefix
  checksummedAddress: string;
  // uppercase hex without 0x prefix
  hexUppercase: string;
}

/**
 * Convert an input address in any supported form into all common representations.
 */
export const convertAddressAll = (input: string): UnifiedAddressFormats => {
  const bytes = parseAddressInput(input);
  if (bytes.length !== 20) {
    throw new Error(
      `Invalid address length ${bytes.length}, expected 20 bytes`
    );
  }

  const hexLower = Buffer.from(bytes).toString("hex");
  const checksummedAddress = ethers.getAddress(`0x${hexLower}`);

  const hexUppercase = hexLower.toUpperCase();
  const bech32Acc = hexToBech32(checksummedAddress, ZETA_HRP);
  const bech32Valoper = hexToBech32(checksummedAddress, ZETA_VALOPER_HRP);
  const bech32Valcons = hexToBech32(checksummedAddress, ZETA_VALCONS_HRP);

  return {
    bech32Acc,
    bech32Valcons,
    bech32Valoper,
    bytes: Array.from(bytes),
    checksummedAddress,
    hexUppercase,
  };
};
