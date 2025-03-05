import { isNull } from "lodash";

import { getBitSize, isValidBitSize } from "./bitsize";
import { SolidityType } from "./parseAbiValues.types";
import { toHexString } from "./toHexString";

export const parseAbiValues = (types: string, values: string[]) => {
  let typesArray: SolidityType[];

  try {
    typesArray = JSON.parse(types);
  } catch (e) {
    throw new Error(`Invalid types array: ${types}`);
  }

  // Validate that typesArray is an array
  if (!Array.isArray(typesArray)) {
    throw new Error(`Expected types to be an array, got: ${types}`);
  }

  // Validate that typesArray and values have the same length
  if (typesArray.length !== values.length) {
    throw new Error("Mismatch between types and values array lengths");
  }

  // Regex to validate integer strings (optional '-' followed by digits)
  const INTEGER_PATTERN = /^-?\d+$/;

  return values.map((value: string, index: number) => {
    const type = typesArray[index];

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
    } else if (type.startsWith("bytes")) {
      return toHexString(value);
    } else if (["address", "string"].includes(type)) {
      return value;
    } else {
      throw new Error(`Unsupported type: ${type}`);
    }
  });
};
