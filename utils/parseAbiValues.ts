import { isNull } from "lodash";

import { getBitSize, isValidBitSize } from "./bitsize";
import { SolidityType } from "./parseAbiValues.types";
import { toHexString } from "./toHexString";

export const parseAbiValues = (types: SolidityType[], values: string[]) => {
  // if (types.length !== values.length) {
  //   throw new Error("Mismatch between types and values array lengths");
  // }

  // Regex to validate integer strings (optional '-' followed by digits)
  const INTEGER_PATTERN = /^-?\d+$/;

  return values.map((value: string, index: number) => {
    const type = types[index];
    console.debug("parseAbiValues", { type, types, value, values });

    if (type === "bool") {
      const lowerCaseValue = value.toLowerCase();
      if (lowerCaseValue === "true" || lowerCaseValue === "false") {
        return lowerCaseValue === "true";
      }
      throw new Error(`Invalid boolean value: ${value}`);
    } else if (type.startsWith("uint") || type.startsWith("int")) {
      const bitSize = getBitSize(type);
      if (isNull(bitSize) || !isValidBitSize(bitSize)) {
        throw new Error(`Invalid bit size for type ${type}: ${bitSize}`);
      }

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
