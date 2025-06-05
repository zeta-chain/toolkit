import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

import { keypairFromPrivateKey } from "../utils/solana.commands.helpers";

describe("keypairFromPrivateKey", () => {
  // Generate a test keypair for consistent testing
  const testKeypair = Keypair.generate();
  const base58PrivateKey = bs58.encode(testKeypair.secretKey);
  const hexPrivateKey = Buffer.from(testKeypair.secretKey).toString("hex");

  describe("base58 format", () => {
    it("should create keypair from valid base58 private key", () => {
      const result = keypairFromPrivateKey(base58PrivateKey);
      expect(result.publicKey.toBase58()).toBe(
        testKeypair.publicKey.toBase58()
      );
    });
  });

  describe("hex format", () => {
    it("should create keypair from valid hex private key without 0x prefix", () => {
      const result = keypairFromPrivateKey(hexPrivateKey);
      expect(result.publicKey.toBase58()).toBe(
        testKeypair.publicKey.toBase58()
      );
    });

    it("should create keypair from valid hex private key with 0x prefix", () => {
      const result = keypairFromPrivateKey(`0x${hexPrivateKey}`);
      expect(result.publicKey.toBase58()).toBe(
        testKeypair.publicKey.toBase58()
      );
    });

    it("should throw error for invalid hex format", () => {
      expect(() => keypairFromPrivateKey("0xInvalidHex")).toThrow(
        "Invalid private key format. Must be either base58 or valid hex"
      );
    });

    it("should throw error for hex with wrong length (let Solana library handle it)", () => {
      expect(() => keypairFromPrivateKey("0x1234")).toThrow(
        "Invalid hex private key"
      );
    });
  });

  describe("invalid formats", () => {
    it("should throw error for empty string", () => {
      expect(() => keypairFromPrivateKey("")).toThrow(
        "Invalid hex private key"
      );
    });

    it("should throw error for invalid characters", () => {
      expect(() => keypairFromPrivateKey("invalid-private-key")).toThrow(
        "Invalid private key format. Must be either base58 or valid hex"
      );
    });

    it("should throw error for mixed invalid format", () => {
      expect(() => keypairFromPrivateKey("0xGGGG")).toThrow(
        "Invalid private key format. Must be either base58 or valid hex"
      );
    });
  });
});
