import { describe, expect, it } from "@jest/globals";

import { parseAbiValues } from "../utils/parseAbiValues";

describe("parseAbiValues", () => {
  it("should correctly parse boolean values", () => {
    const types = '["bool", "bool"]';
    const values = ["true", "false"];
    const result = parseAbiValues(types, values);
    expect(result).toEqual([true, false]);
  });

  it("should throw an error for invalid boolean values", () => {
    const types = '["bool"]';
    const values = ["notABoolean"];
    expect(() => parseAbiValues(types, values)).toThrow(
      "Invalid boolean value: notABoolean"
    );
  });

  it("should correctly parse uint values", () => {
    const types = '["uint256", "uint8"]';
    const values = ["123456789", "42"];
    const result = parseAbiValues(types, values);
    expect(result).toEqual([BigInt("123456789"), BigInt("42")]);
  });

  it("should correctly parse int values", () => {
    const types = '["int256", "int8"]';
    const values = ["-123456789", "42"];
    const result = parseAbiValues(types, values);
    expect(result).toEqual([BigInt("-123456789"), BigInt("42")]);
  });

  it("should throw an error for invalid uint bit sizes", () => {
    const types = '["uint999"]';
    const values = ["456"];
    expect(() => parseAbiValues(types, values)).toThrow(
      "Invalid bit size for type uint999: 999"
    );
  });

  it("should correctly parse bytes values", () => {
    const types = '["bytes"]';
    const values = ["hello"];
    const result = parseAbiValues(types, values);
    expect(result).toEqual(["0x68656c6c6f"]); // "hello" in hex
  });

  it("should not modify bytes values that are already hex strings", () => {
    const types = '["bytes"]';
    const values = ["0x1234"];
    const result = parseAbiValues(types, values);
    expect(result).toEqual(["0x1234"]); // Already a hex string, no change
  });

  it("should correctly parse fixed-size bytes values (e.g., bytes32)", () => {
    const types = '["bytes32"]';
    const values = ["hello"];
    const result = parseAbiValues(types, values);
    expect(result).toEqual(["0x68656c6c6f"]); // "hello" in hex
  });

  it("should return string and address values as-is", () => {
    const types = '["string", "address"]';
    const values = ["hello", "0x1234567890abcdef"];
    const result = parseAbiValues(types, values);
    expect(result).toEqual(["hello", "0x1234567890abcdef"]);
  });

  it("should handle mixed types correctly", () => {
    const types = '["bool", "uint256", "bytes", "string"]';
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
    const types = '["bool", "uint256"]';
    const values = ["true"];
    expect(() => parseAbiValues(types, values)).toThrow(
      "Mismatch between types and values array lengths"
    );
  });

  it("should throw an error for unsupported types", () => {
    const types = '["unsupportedType", "invalidType"]';
    const values = ["value1", "value2"];
    expect(() => parseAbiValues(types, values)).toThrow(
      "Unsupported type: unsupportedType"
    );
  });

  it("should throw an error for partially unsupported types", () => {
    const types = '["uint256", "invalidType"]';
    const values = ["123", "value2"];
    expect(() => parseAbiValues(types, values)).toThrow(
      "Unsupported type: invalidType"
    );
  });

  it("should return empty array for empty types array", () => {
    const types = "[]";
    const values: string[] = [];
    const result = parseAbiValues(types, values);
    expect(result).toEqual([]);
  });

  it("should throw an error for empty values array", () => {
    const types = '["uint256"]';
    const values: string[] = [];
    expect(() => parseAbiValues(types, values)).toThrow(
      "Mismatch between types and values array lengths"
    );
  });

  it("should throw an error for invalid JSON in types", () => {
    const types = '["address", "bytes", "bool"'; // Invalid JSON
    const values = [
      "0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD",
      "0x4955a3F38ff86ae92A914445099caa8eA2B9bA32",
      "true",
    ];
    expect(() => parseAbiValues(types, values)).toThrow("Invalid types array");
  });

  it("should throw an error if types is not an array", () => {
    const types = '"address"'; // Not an array
    const values = ["0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD"];
    expect(() => parseAbiValues(types, values)).toThrow(
      'Expected types to be an array, got: "address"'
    );
  });
});
