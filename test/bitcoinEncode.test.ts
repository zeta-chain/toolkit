import { ethers } from "ethers";

import {
  Address,
  bitcoinEncode,
  BtcAddress,
  trimOx,
} from "../packages/client/src/bitcoinEncode";

describe("Bitcoin Encode Functions", () => {
  // Test data
  const receiverAddress: Address = "0x1234567890123456789012345678901234567890";
  const btcRevertAddress: BtcAddress =
    "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";

  // Mock payload for testing
  const mockOperation = {
    test: 1,
  };

  describe("bitcoinEncode function", () => {
    it("should encode data with default parameters", () => {
      // Simple payload
      const payload = Buffer.from("test payload");

      // Call the function
      const result = bitcoinEncode(receiverAddress, payload, btcRevertAddress);

      // Check that result is a non-empty string
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should produce different outputs for different payloads", () => {
      const payload1 = Buffer.from("payload1");
      const payload2 = Buffer.from("payload2");

      const result1 = bitcoinEncode(
        receiverAddress,
        payload1,
        btcRevertAddress
      );
      const result2 = bitcoinEncode(
        receiverAddress,
        payload2,
        btcRevertAddress
      );

      expect(result1).not.toEqual(result2);
    });

    it("should encode data with custom opCode", () => {
      const payload = Buffer.from("test payload");
      const customOpCode = 0b0010; // Call

      const defaultResult = bitcoinEncode(
        receiverAddress,
        payload,
        btcRevertAddress
      );
      const customResult = bitcoinEncode(
        receiverAddress,
        payload,
        btcRevertAddress,
        customOpCode
      );

      expect(customResult).not.toEqual(defaultResult);
    });

    it("should encode complex payload data correctly", () => {
      const params = new ethers.AbiCoder().encode(
        ["address", "bytes", "bool"],
        [
          "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0",
          "0x4955a3F38ff86ae92A914445099caa8eA2B9bA32",
          true,
        ]
      );

      const message = new ethers.AbiCoder().encode(
        ["uint8", "bytes"],
        [mockOperation.test, params]
      );
      const payload = Buffer.from(trimOx(message), "hex");
      const result = bitcoinEncode(receiverAddress, payload, btcRevertAddress);

      expect(result).toMatch(
        "5a00100700000000000000000000000012345678901234567890123456789012345678900000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000005ba149a7bd6dc1f937fa9046a9e05c05f3b18b00000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000144955a3f38ff86ae92a914445099caa8ea2b9ba32000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a626331717879326b676479676a727371747a71326e30797266323439337038336b6b666a687830776c6800000000000000000000000000000000000000000000"
      );
    });
  });

  describe("trimOx function", () => {
    it("should remove 0x prefix when present", () => {
      expect(trimOx("0x1234")).toBe("1234");
    });

    it("should leave string unchanged when no 0x prefix", () => {
      expect(trimOx("1234")).toBe("1234");
    });

    it("should handle empty string", () => {
      expect(trimOx("")).toBe("");
    });
  });
});
