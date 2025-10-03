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
