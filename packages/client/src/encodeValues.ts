import { ethers } from "ethers";

export const encodeValues = (types: string[], values: any[]) => {
  return values.map((value: any, index: number) => {
    const type = types[index];

    if (type === "bool") {
      try {
        return JSON.parse(value.toLowerCase());
      } catch (e) {
        throw new Error(`Invalid boolean value: ${value}`);
      }
    } else if (type.startsWith("uint") || type.startsWith("int")) {
      return BigInt(value);
    } else if (type === "bytes") {
      return value.startsWith("0x") ? value : ethers.utils.toUtf8Bytes(value);
    } else {
      return value;
    }
  });
};
