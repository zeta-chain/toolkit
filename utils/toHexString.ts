import { ethers } from "ethers";

export const toHexString = (data: string) => {
  // Validate input type
  if (typeof data !== "string") {
    throw new Error(`Input must be a string, got: ${typeof data}`);
  }

  // Handle empty strings
  if (data === "") {
    return "0x";
  }

  // Handle hex strings
  if (data.startsWith("0x")) {
    // Validate hex content
    const hexContentPattern = /^[0-9a-fA-F]*$/;
    const hexContent = data.slice(2);
    if (!hexContentPattern.test(hexContent)) {
      throw new Error(`Invalid hex string: ${data}`);
    }
    return data;
  }

  // Convert regular strings to hex
  return ethers.hexlify(ethers.toUtf8Bytes(data));
};
