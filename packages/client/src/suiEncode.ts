import { ethers } from "ethers";

export interface EncodeOptions {
  data: string;
  objects?: string[];
  typeArguments?: string[];
}

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
