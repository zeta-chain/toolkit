import { ethers } from "ethers";

export interface EncodeOptions {
  data: string;
  objects?: string[];
  typeArguments?: string[];
}

/**
 * Encodes data for Sui blockchain transactions using ethers.js
 *
 * @param {EncodeOptions} options - The encoding options
 * @param {string} options.data - The data to encode
 * @param {string[]} [options.typeArguments=[]] - Type arguments for generic functions
 * @param {string[]} [options.objects=[]] - Object references to include
 * @returns {string} The ABI-encoded data suitable for Sui transactions
 */
export const suiEncode = ({
  data,
  typeArguments = [],
  objects = [],
}: EncodeOptions): string => {
  const paddedObjects = objects.map((obj) =>
    ethers.zeroPadValue(obj.trim(), 32)
  );

  // If data starts with 0x, treat it as a hex string, otherwise encode as UTF-8
  const encodedData = data.startsWith("0x")
    ? data
    : ethers.hexlify(ethers.toUtf8Bytes(data));

  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(string[] typeArguments, bytes32[] objects, bytes message)"],
    [[typeArguments, paddedObjects, encodedData]]
  );

  return encoded;
};
