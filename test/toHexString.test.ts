import { describe, expect, it } from "@jest/globals";

import { toHexString } from "../utils/toHexString";

describe("toHexString", () => {
  it("should convert a regular string to a hex string", () => {
    expect(toHexString("hello")).toBe("0x68656c6c6f"); // "hello" in hex
    expect(toHexString("world")).toBe("0x776f726c64"); // "world" in hex
    expect(toHexString("123")).toBe("0x313233"); // "123" in hex
  });

  it("should return the input as-is if it is already a hex string", () => {
    expect(toHexString("0x1234")).toBe("0x1234"); // Already a hex string
    expect(toHexString("0xabcdef")).toBe("0xabcdef"); // Already a hex string
  });

  it("should handle empty strings", () => {
    expect(toHexString("")).toBe("0x"); // Empty string
  });

  it("should handle strings with special characters", () => {
    expect(toHexString("!@#$%^&*()")).toBe("0x21402324255e262a2829"); // Special characters in hex
    expect(toHexString("🚀")).toBe("0xf09f9a80"); // Rocket emoji in hex
  });

  it("should correctly encode Solana account addresses", () => {
    const solanaAddr = "HzmjfpWytYAcppQkYyp611BDf6vXUUFMMhRF7ndHYCMi";
    expect(toHexString(solanaAddr)).toBe(
      "0x487a6d6a66705779745941637070516b5979703631314244663676585555464d4d685246376e644859434d69"
    );
  });

  it("should handle strings with spaces", () => {
    expect(toHexString("hello world")).toBe("0x68656c6c6f20776f726c64"); // "hello world" in hex
    expect(toHexString("  ")).toBe("0x2020"); // Two spaces in hex
  });

  it.each([
    { input: null, type: "object" },
    { input: undefined, type: "undefined" },
    { input: 123, type: "number" },
    { input: {}, type: "object" },
  ])("should throw for non-string input: $input", ({ input, type }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    expect(() => toHexString(input as any)).toThrow(
      `Input must be a string, got: ${type}`
    );
  });

  it.each(["0xInvalid", "0x123z"])(
    "should throw for invalid hex string: %s",
    (invalidHex) => {
      expect(() => toHexString(invalidHex)).toThrow(
        `Invalid hex string: ${invalidHex}`
      );
    }
  );

  it("should handle very long strings", () => {
    const longString = "a".repeat(100000); // 100,000 characters
    const result = toHexString(longString);
    expect(result).toBe(`0x${"61".repeat(100000)}`); // "a" in hex is "61"
  });
});
