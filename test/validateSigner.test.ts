import { describe, expect, it } from "@jest/globals";
import { ethers } from "ethers";

import { validateSigner } from "../utils";

describe("validateSigner", () => {
  it("should return the signer if it has a valid provider", () => {
    // Mock a valid signer with a provider
    const mockProvider = new ethers.JsonRpcProvider();
    const mockSigner = new ethers.Wallet(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Private key for address 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
      mockProvider
    );

    const result = validateSigner(mockSigner);
    expect(result).toBe(mockSigner);
  });

  it("should throw an error if the signer is undefined", () => {
    expect(() => validateSigner(undefined)).toThrow(
      "Signer is undefined. Please provide a valid signer."
    );
  });
});
