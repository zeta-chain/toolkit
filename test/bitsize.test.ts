import { describe, expect, it } from "@jest/globals";

import { getBitSize, isValidBitSize } from "../utils/bitsize";

describe("isValidBitSize", () => {
  it("should return true for valid bit sizes", () => {
    expect(isValidBitSize(8)).toBe(true);
    expect(isValidBitSize(16)).toBe(true);
    expect(isValidBitSize(256)).toBe(true);
  });

  it("should return false for invalid bit sizes", () => {
    expect(isValidBitSize(7)).toBe(false); // Not a multiple of 8
    expect(isValidBitSize(257)).toBe(false); // Outside the valid range
    expect(isValidBitSize(0)).toBe(false); // Invalid bit size
    expect(isValidBitSize(-8)).toBe(false); // Negative bit size
  });
});

describe("getBitSize", () => {
  it("should return the correct bit size for valid int and uint types", () => {
    expect(getBitSize("int8")).toBe(8);
    expect(getBitSize("uint256")).toBe(256);
    expect(getBitSize("int128")).toBe(128);
    expect(getBitSize("uint64")).toBe(64);
  });

  it("should return null for types without a bit size", () => {
    expect(getBitSize("int")).toBeNull(); // No bit size
    expect(getBitSize("uint")).toBeNull(); // No bit size
  });

  it("should return null for invalid int and uint types", () => {
    expect(getBitSize("intabc")).toBeNull(); // Invalid suffix
    expect(getBitSize("uint-123")).toBeNull(); // Invalid suffix
    expect(getBitSize("int")).toBeNull(); // No suffix
    expect(getBitSize("uint")).toBeNull(); // No suffix
  });

  it("should return null for non-int and non-uint types", () => {
    expect(getBitSize("bool")).toBeNull(); // Not an int or uint type
    expect(getBitSize("bytes32")).toBeNull(); // Not an int or uint type
    expect(getBitSize("address")).toBeNull(); // Not an int or uint type
  });
});
