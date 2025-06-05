import { trim0x } from "../utils/trim0x";

describe("trim0x", () => {
  it("should remove 0x prefix from hex string", () => {
    const input = "0x1234abcd";
    const expected = "1234abcd";
    expect(trim0x(input)).toBe(expected);
  });

  it("should return the same string if no 0x prefix", () => {
    const input = "1234abcd";
    const expected = "1234abcd";
    expect(trim0x(input)).toBe(expected);
  });

  it("should handle empty string", () => {
    const input = "";
    const expected = "";
    expect(trim0x(input)).toBe(expected);
  });

  it("should handle string that only contains 0x", () => {
    const input = "0x";
    const expected = "";
    expect(trim0x(input)).toBe(expected);
  });

  it("should not remove 0x from middle of string", () => {
    const input = "abc0x123";
    const expected = "abc0x123";
    expect(trim0x(input)).toBe(expected);
  });

  it("should handle case-insensitive 0x prefix", () => {
    const input = "0X1234abcd";
    const expected = "0X1234abcd"; // Should not remove uppercase 0X
    expect(trim0x(input)).toBe(expected);
  });
});
