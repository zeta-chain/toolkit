import { describe, expect, it } from "@jest/globals";

import { parseAbiValues } from "../utils/parseAbiValues";
import { SolidityType } from "../utils/parseAbiValues.types";

describe("parseAbiValues", () => {
  it("should correctly parse boolean values", () => {
    const types: SolidityType[] = ["bool", "bool"];
    const values = ["true", "false"];
    const result = parseAbiValues(types, values);
    expect(result).toEqual([true, false]);
  });

  it("should throw an error for invalid boolean values", () => {
    const types: SolidityType[] = ["bool"];
    const values = ["notABoolean"];
    expect(() => parseAbiValues(types, values)).toThrow(
      "Invalid boolean value: notABoolean"
    );
  });

  it("should correctly parse uint values", () => {
    const types: SolidityType[] = ["uint256", "uint8"];
    const values = ["123456789", "42"];
    const result = parseAbiValues(types, values);
    expect(result).toEqual([BigInt("123456789"), BigInt("42")]);
  });

  it("should correctly parse int values", () => {
    const types: SolidityType[] = ["int256", "int8"];
    const values = ["-123456789", "42"];
    const result = parseAbiValues(types, values);
    expect(result).toEqual([BigInt("-123456789"), BigInt("42")]);
  });

  it("should throw an error for invalid uint bit sizes", () => {
    const types = ["uint999"] as unknown as SolidityType[];
    const values = ["456"];
    expect(() => parseAbiValues(types, values)).toThrow(
      "Invalid bit size for type uint999: 999"
    );
  });

  it("should correctly parse bytes values", () => {
    const types: SolidityType[] = ["bytes"];
    const values = ["hello"];
    const result = parseAbiValues(types, values);
    expect(result).toEqual(["0x68656c6c6f"]); // "hello" in hex
  });

  it("should not modify bytes values that are already hex strings", () => {
    const types: SolidityType[] = ["bytes"];
    const values = ["0x1234"];
    const result = parseAbiValues(types, values);
    expect(result).toEqual(["0x1234"]); // Already a hex string, no change
  });

  it("should return string and address values as-is", () => {
    const types: SolidityType[] = ["string", "address"];
    const values = ["hello", "0x1234567890abcdef"];
    const result = parseAbiValues(types, values);
    expect(result).toEqual(["hello", "0x1234567890abcdef"]);
  });

  it("should handle mixed types correctly", () => {
    const types: SolidityType[] = ["bool", "uint256", "bytes", "string"];
    const values = ["true", "123456789", "hello", "world"];
    const result = parseAbiValues(types, values);
    expect(result).toEqual([
      true,
      BigInt("123456789"),
      "0x68656c6c6f",
      "world",
    ]);
  });

  it("should throw an error if types and values arrays have different lengths", () => {
    const types: SolidityType[] = ["bool", "uint256"];
    const values = ["true"];
    expect(() => parseAbiValues(types, values)).toThrow(
      "Mismatch between types and values array lengths"
    );
  });

  it("should throw an error for unsupported types", () => {
    const types = [
      "unsupportedType",
      "invalidType",
    ] as unknown as SolidityType[];
    const values = ["value1", "value2"];
    expect(() => parseAbiValues(types, values)).toThrow(
      "Unsupported type: unsupportedType"
    );
  });

  it("should throw an error for partially unsupported types", () => {
    const types = ["uint256", "invalidType"] as unknown as SolidityType[];
    const values = ["123", "value2"];
    expect(() => parseAbiValues(types, values)).toThrow(
      "Unsupported type: invalidType"
    );
  });

  it("should return empty array for empty types array", () => {
    const types: SolidityType[] = [];
    const values: string[] = [];
    const result = parseAbiValues(types, values);
    expect(result).toEqual([]);
  });

  it("should throw an error for empty values array", () => {
    const types: SolidityType[] = ["uint256"];
    const values: string[] = [];
    expect(() => parseAbiValues(types, values)).toThrow(
      "Mismatch between types and values array lengths"
    );
  });
});
