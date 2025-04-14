import { ethers } from "ethers";
import {
  bitcoinEncode,
  trimOx,
  Address,
  BtcAddress,
} from "../packages/client/src/bitcoinEncode";

describe("Bitcoin Encode Functions", () => {
  // Test data
  const receiverAddress: Address = "0x1234567890123456789012345678901234567890";
  const btcRevertAddress: BtcAddress =
    "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";

  // Mock payload for testing
  const mockOperation = {
    OpenVault: 1,
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
        [mockOperation.OpenVault, params]
      );
      const payload = Buffer.from(trimOx(message), "hex");

      const result = bitcoinEncode(receiverAddress, payload, btcRevertAddress);

      // Verify result is a non-empty hex string
      expect(result).toMatch(/^[0-9a-f]+$/i);
      expect(result.length).toBeGreaterThan(0);
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
