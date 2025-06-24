import { CCTX } from "../types/trackCCTX.types";
import {
  formatStatusText,
  normalizeFloat,
  shortenHash,
} from "../utils/formatting";

// Define a partial CCTX type for tests that allows undefined status_message
type TestCCTX = Omit<CCTX, "status_message"> & {
  status_message?: string;
};

describe("shortenHash", () => {
  it("should shorten a hash correctly", () => {
    const hash =
      "0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0";
    const shortened = shortenHash(hash);
    expect(shortened).toBe("0x12345678...9abcdef0");
  });

  it("should handle short hashes", () => {
    const hash = "0x1234";
    const shortened = shortenHash(hash);
    expect(shortened).toBe("0x1234");
  });
});

describe("formatStatusText", () => {
  it("should format status text with a message", () => {
    const tx: TestCCTX = {
      confirmed_on_destination: false,
      outbound_tx_hash: "hash",
      outbound_tx_tss_nonce: 1,
      receiver_chainId: "2",
      sender_chain_id: "1",
      status: "OutboundMined",
      status_message: "Success",
    };
    const formatted = formatStatusText(tx as CCTX);
    expect(formatted).toBe("OutboundMined (Success)");
  });

  it("should format status text without a message", () => {
    const tx: TestCCTX = {
      confirmed_on_destination: false,
      outbound_tx_hash: "hash",
      outbound_tx_tss_nonce: 1,
      receiver_chainId: "2",
      sender_chain_id: "1",
      status: "OutboundMined",
      status_message: "",
    };
    const formatted = formatStatusText(tx as CCTX);
    expect(formatted).toBe("OutboundMined");
  });

  it("should handle undefined status message", () => {
    const tx: TestCCTX = {
      confirmed_on_destination: false,
      outbound_tx_hash: "hash",
      outbound_tx_tss_nonce: 1,
      receiver_chainId: "2",
      sender_chain_id: "1",
      status: "OutboundMined",
      status_message: undefined,
    };
    const formatted = formatStatusText(tx as CCTX);
    expect(formatted).toBe("OutboundMined");
  });
});

describe("normalizeFloat", () => {
  it("should normalize float strings by removing trailing zeros", () => {
    expect(normalizeFloat("3.14000")).toBe("3.14");
    expect(normalizeFloat("10.00")).toBe("10");
    expect(normalizeFloat("0.10000")).toBe("0.1");
    expect(normalizeFloat("123.45000")).toBe("123.45");
  });

  it("should handle integer strings", () => {
    expect(normalizeFloat("42")).toBe("42");
    expect(normalizeFloat("0")).toBe("0");
    expect(normalizeFloat("100")).toBe("100");
  });

  it("should handle decimal numbers without trailing zeros", () => {
    expect(normalizeFloat("3.14")).toBe("3.14");
    expect(normalizeFloat("0.5")).toBe("0.5");
    expect(normalizeFloat("123.456")).toBe("123.456");
  });

  it("should handle scientific notation", () => {
    expect(normalizeFloat("1e5")).toBe("100000");
    expect(normalizeFloat("1.23e-4")).toBe("0.000123");
    expect(normalizeFloat("2.5e2")).toBe("250");
  });

  it("should handle negative numbers", () => {
    expect(normalizeFloat("-3.14000")).toBe("-3.14");
    expect(normalizeFloat("-10.00")).toBe("-10");
    expect(normalizeFloat("-0.10000")).toBe("-0.1");
  });

  it("should handle edge cases with zeros", () => {
    expect(normalizeFloat("0.0000")).toBe("0");
    expect(normalizeFloat("000.000")).toBe("0");
    expect(normalizeFloat("00123.000")).toBe("123");
  });

  it("should handle empty strings and whitespace as zero", () => {
    expect(normalizeFloat("")).toBe("0");
    expect(normalizeFloat("   ")).toBe("0");
    expect(normalizeFloat("\t")).toBe("0");
    expect(normalizeFloat("\n")).toBe("0");
  });

  it("should throw error for invalid number strings", () => {
    expect(() => normalizeFloat("abc")).toThrow("'abc' is not a valid number");
    expect(() => normalizeFloat("12.34.56")).toThrow(
      "'12.34.56' is not a valid number"
    );
    expect(() => normalizeFloat("12a34")).toThrow(
      "'12a34' is not a valid number"
    );
    expect(() => normalizeFloat("hello123")).toThrow(
      "'hello123' is not a valid number"
    );
  });

  it("should throw error for infinity and NaN", () => {
    expect(() => normalizeFloat("Infinity")).toThrow(
      "'Infinity' is not a valid number"
    );
    expect(() => normalizeFloat("-Infinity")).toThrow(
      "'-Infinity' is not a valid number"
    );
    expect(() => normalizeFloat("NaN")).toThrow("'NaN' is not a valid number");
  });

  it("should handle very small and very large numbers", () => {
    expect(normalizeFloat("0.000000001")).toBe("1e-9");
    expect(normalizeFloat("999999999999999")).toBe("999999999999999");
    expect(normalizeFloat("1.23456789012345e-10")).toBe("1.23456789012345e-10");
  });
});
