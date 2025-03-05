import { SolidityType } from "./parseAbiValues.types";
import { toHexString } from "./toHexString";

const VALID_BIT_SIZES = [
  8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 128, 136, 144,
  152, 160, 168, 176, 184, 192, 200, 208, 216, 224, 232, 240, 248, 256,
];

const isValidBitSize = (bitSize: number): boolean => {
  return VALID_BIT_SIZES.includes(bitSize);
};

const getBitSize = (type: string): number | null => {
  const match = type.match(/^(u?int)(\d+)$/);
  if (match) {
    return parseInt(match[2], 10); // Extract the number suffix
  }
  return null; // No bit size found (e.g., "int" or "uint")
};

export const parseAbiValues = (types: SolidityType[], values: string[]) => {
  if (types.length !== values.length) {
    throw new Error("Mismatch between types and values array lengths");
  }

  // Regex to validate integer strings (optional '-' followed by digits)
  const INTEGER_PATTERN = /^-?\d+$/;

  return values.map((value: string, index: number) => {
    const type = types[index];

    if (type === "bool") {
      const lowerCaseValue = value.toLowerCase();
      if (lowerCaseValue === "true" || lowerCaseValue === "false") {
        return lowerCaseValue === "true";
      }
      throw new Error(`Invalid boolean value: ${value}`);
    } else if (type.startsWith("uint") || type.startsWith("int")) {
      // Validate the bit size
      const bitSize = getBitSize(type);
      if (bitSize === null || !isValidBitSize(bitSize)) {
        throw new Error(`Invalid bit size for type ${type}: ${bitSize}`);
      }

      // Validate the integer value
      if (!INTEGER_PATTERN.test(value)) {
        throw new Error(`Invalid integer value for type ${type}: ${value}`);
      }
      return BigInt(value);
    } else if (type === "bytes") {
      return toHexString(value);
    } else if (type === "address" || type === "string") {
      return value;
    } else if (type.startsWith("bytes")) {
      // Handle fixed-size bytes (e.g., bytes1, bytes2, ..., bytes32)
      return toHexString(value);
    } else {
      throw new Error(`Unsupported type: ${type}`);
    }
  });
};
