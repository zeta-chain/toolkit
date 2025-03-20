import { describe, expect, it } from "@jest/globals";

import { compareBigIntAndNumber } from "../utils";

describe("compareBigIntAndNumber", () => {
  // Test case 1: Equal values (bigint and number)
  it("should return true when the bigint and number values are equal", () => {
    const bigIntValue = BigInt(123);
    const numberValue = 123;

    const result = compareBigIntAndNumber(bigIntValue, numberValue);
    expect(result).toBe(true);
  });

  // Test case 2: Non-equal values (bigint and number)
  it("should return false when the bigint and number values are not equal", () => {
    const bigIntValue = BigInt(456);
    const numberValue = 123;

    const result = compareBigIntAndNumber(bigIntValue, numberValue);
    expect(result).toBe(false);
  });

  // Test case 3: Non-integer number (should throw an error)
  it("should throw an error when the number value is not an integer", () => {
    const bigIntValue = BigInt(123);
    const numberValue = 123.45;

    expect(() => compareBigIntAndNumber(bigIntValue, numberValue)).toThrow(
      "The number value must be an integer."
    );
  });

  // Test case 4: Invalid bigint value (should throw an error)
  it("should throw an error when the bigIntValue is not a bigint", () => {
    const bigIntValue = "123" as unknown as bigint; // Simulate invalid input
    const numberValue = 123;

    expect(() => compareBigIntAndNumber(bigIntValue, numberValue)).toThrow(
      "The bigIntValue must be of type bigint."
    );
  });

  // Test case 5: Large number within safe range
  it("should handle large numbers within the safe integer range", () => {
    const bigIntValue = BigInt(Number.MAX_SAFE_INTEGER); // 9007199254740991n
    const numberValue = Number.MAX_SAFE_INTEGER; // 9007199254740991

    const result = compareBigIntAndNumber(bigIntValue, numberValue);
    expect(result).toBe(true);
  });

  // Test case 6: Large number outside safe range (should throw an error)
  it("should throw an error when the number is outside the safe integer range", () => {
    const bigIntValue = BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1); // 9007199254740992n
    const numberValue = Number.MAX_SAFE_INTEGER + 1; // 9007199254740992 (not safe)

    expect(() => compareBigIntAndNumber(bigIntValue, numberValue)).toThrow(
      "The number value is outside the safe integer range."
    );
  });

  // Test case 7: Zero values
  it("should return true when both values are zero", () => {
    const bigIntValue = BigInt(0);
    const numberValue = 0;

    const result = compareBigIntAndNumber(bigIntValue, numberValue);
    expect(result).toBe(true);
  });

  // Test case 8: Negative values
  it("should handle negative values correctly", () => {
    const bigIntValue = BigInt(-123);
    const numberValue = -123;

    const result = compareBigIntAndNumber(bigIntValue, numberValue);
    expect(result).toBe(true);
  });
});
