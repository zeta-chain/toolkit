import { utils } from "ethers";
import { isNull } from "lodash";

import {
  ParseAbiValuesReturnType,
  solidityTypeArraySchema,
} from "../types/parseAbiValues.types";
import { getBitSize, isValidBitSize } from "./bitsize";
import { toHexString } from "./toHexString";

export const parseAbiValues = (
  types: string,
  values: string[]
): ParseAbiValuesReturnType => {
  let typesArray: string[] = [];

  try {
    const validationResult = solidityTypeArraySchema.safeParse(
      JSON.parse(types)
    );

    if (!validationResult.success) {
      throw new Error(validationResult.error.errors[0].message);
    }

    typesArray = validationResult.data;
  } catch {
    throw new Error(`Invalid types array: (${types})`);
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

      if (type.startsWith("uint") && value.startsWith("-")) {
        throw new Error(`Invalid integer value for type ${type}: ${value}`);
      }

      return BigInt(value);
    } else if (type.startsWith("bytes")) {
      return toHexString(value);
    } else if (type === "address") {
      if (!utils.isAddress(value)) {
        throw new Error(`Invalid evm address for type ${type}: ${value}`);
      }

      return value;
    } else if (type === "string") {
      return value;
    } else {
      throw new Error(`Unsupported type: ${type}`);
    }
  });
};
