import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

// Mock the generateBitcoinAddress import
jest.mock("../utils/generateBitcoinAddress", () => ({
  generateBitcoinAddress: jest
    .fn()
    .mockImplementation((privateKey, network) => {
      if (privateKey === "invalid") {
        throw new Error("Invalid private key");
      }
      return network === "mainnet"
        ? "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
        : "tb1ql7w62elx9ucw4pj5lgw4l028hmuw80sndtntxt";
    }),
}));

import {
  resolveBitcoinAddress,
  resolveEvmAddress,
  resolveSolanaAddress,
} from "../utils/addressResolver";

// Mock environment variable access
const originalEnv = process.env;

// Sample addresses for testing
const VALID_EVM_ADDRESS = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";
const INVALID_EVM_ADDRESS = "0xINVALID";
const VALID_EVM_PRIVATE_KEY =
  "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const VALID_SOLANA_ADDRESS = "CgngE9RF1W3FyNP3HEP9WM5wQFGQLdaXywSEAV4YHxxw";
const INVALID_SOLANA_ADDRESS = "INVALID_SOLANA_ADDRESS";
// Create a sample Solana keypair for testing
const solanaKeypair = Keypair.generate();
const VALID_SOLANA_PRIVATE_KEY = bs58.encode(solanaKeypair.secretKey);
const VALID_SOLANA_PRIVATE_KEY_ARRAY = JSON.stringify(
  Array.from(solanaKeypair.secretKey)
);

const VALID_BTC_MAINNET_ADDRESS = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"; // Bitcoin genesis address
const VALID_BTC_TESTNET_ADDRESS = "tb1ql7w62elx9ucw4pj5lgw4l028hmuw80sndtntxt"; // Random testnet address
const INVALID_BTC_ADDRESS = "INVALID_BTC_ADDRESS";
// WIF-formatted Bitcoin private key (for testing only, not a real key with funds)
const VALID_BTC_PRIVATE_KEY =
  "5KYZdUEo39z3FPrtuX2QbbwGnNP5zTd7yyr2SC1j299sBCnWjss";

describe("Address Resolver Utils", () => {
  // Setup and teardown
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };

    // Clear environment variables we'll test
    delete process.env.EVM_PRIVATE_KEY;
    delete process.env.PRIVATE_KEY;
    delete process.env.SOLANA_PRIVATE_KEY;
    delete process.env.BTC_PRIVATE_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("resolveEvmAddress", () => {
    it("should return a valid EVM address", () => {
      const result = resolveEvmAddress({ evmAddress: VALID_EVM_ADDRESS });
      expect(result).toBe(VALID_EVM_ADDRESS);
    });

    it("should return undefined for invalid EVM address", () => {
      const result = resolveEvmAddress({ evmAddress: INVALID_EVM_ADDRESS });
      expect(result).toBeUndefined();
    });

    it("should derive address from EVM_PRIVATE_KEY", () => {
      process.env.EVM_PRIVATE_KEY = VALID_EVM_PRIVATE_KEY;
      const result = resolveEvmAddress({});
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("should derive address from PRIVATE_KEY", () => {
      process.env.PRIVATE_KEY = VALID_EVM_PRIVATE_KEY;
      const result = resolveEvmAddress({});
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("should return undefined if no address and no private key", () => {
      const result = resolveEvmAddress({});
      expect(result).toBeUndefined();
    });

    it("should call error handler if private key is invalid", () => {
      process.env.EVM_PRIVATE_KEY = "invalid";
      const mockErrorHandler = jest.fn();
      const result = resolveEvmAddress({ handleError: mockErrorHandler });
      expect(result).toBeUndefined();
      expect(mockErrorHandler).toHaveBeenCalled();
    });
  });

  describe("resolveSolanaAddress", () => {
    it("should return a valid Solana address", () => {
      const result = resolveSolanaAddress({
        solanaAddress: VALID_SOLANA_ADDRESS,
      });
      expect(result).toBe(VALID_SOLANA_ADDRESS);
    });

    it("should return undefined for invalid Solana address", () => {
      const result = resolveSolanaAddress({
        solanaAddress: INVALID_SOLANA_ADDRESS,
      });
      expect(result).toBeUndefined();
    });

    it("should derive address from base58 encoded SOLANA_PRIVATE_KEY", () => {
      process.env.SOLANA_PRIVATE_KEY = VALID_SOLANA_PRIVATE_KEY;
      const result = resolveSolanaAddress({});
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("should derive address from JSON array SOLANA_PRIVATE_KEY", () => {
      process.env.SOLANA_PRIVATE_KEY = VALID_SOLANA_PRIVATE_KEY_ARRAY;
      const result = resolveSolanaAddress({});
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("should return undefined if no address and no private key", () => {
      const result = resolveSolanaAddress({});
      expect(result).toBeUndefined();
    });

    it("should call error handler if private key is invalid", () => {
      process.env.SOLANA_PRIVATE_KEY = "invalid";
      const mockErrorHandler = jest.fn();
      const result = resolveSolanaAddress({ handleError: mockErrorHandler });
      expect(result).toBeUndefined();
      expect(mockErrorHandler).toHaveBeenCalled();
    });
  });

  describe("resolveBitcoinAddress", () => {
    it("should return a valid Bitcoin mainnet address", () => {
      const result = resolveBitcoinAddress({
        bitcoinAddress: VALID_BTC_MAINNET_ADDRESS,
        isMainnet: true,
      });
      expect(result).toBe(VALID_BTC_MAINNET_ADDRESS);
    });

    it("should return a valid Bitcoin testnet address", () => {
      const result = resolveBitcoinAddress({
        bitcoinAddress: VALID_BTC_TESTNET_ADDRESS,
        isMainnet: false,
      });
      expect(result).toBe(VALID_BTC_TESTNET_ADDRESS);
    });

    it("should return undefined for invalid Bitcoin address", () => {
      const result = resolveBitcoinAddress({
        bitcoinAddress: INVALID_BTC_ADDRESS,
      });
      expect(result).toBeUndefined();
    });

    it("should validate address against correct network", () => {
      // Mainnet address should fail on testnet
      const resultMainnetOnTestnet = resolveBitcoinAddress({
        bitcoinAddress: VALID_BTC_MAINNET_ADDRESS,
        isMainnet: false,
      });
      expect(resultMainnetOnTestnet).toBeUndefined();

      // Testnet address should fail on mainnet
      const resultTestnetOnMainnet = resolveBitcoinAddress({
        bitcoinAddress: VALID_BTC_TESTNET_ADDRESS,
        isMainnet: true,
      });
      expect(resultTestnetOnMainnet).toBeUndefined();
    });

    it("should derive address from BTC_PRIVATE_KEY", () => {
      process.env.BTC_PRIVATE_KEY = VALID_BTC_PRIVATE_KEY;
      const result = resolveBitcoinAddress({ isMainnet: true });
      expect(result).toBe(VALID_BTC_MAINNET_ADDRESS);
    });

    it("should return undefined if no address and no private key", () => {
      const result = resolveBitcoinAddress({});
      expect(result).toBeUndefined();
    });

    it("should call error handler if private key is invalid", () => {
      process.env.BTC_PRIVATE_KEY = "invalid";
      const mockErrorHandler = jest.fn();
      const result = resolveBitcoinAddress({ handleError: mockErrorHandler });
      expect(result).toBeUndefined();
      expect(mockErrorHandler).toHaveBeenCalled();
    });
  });
});
