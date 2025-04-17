import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import os from "os";

import {
  getAccountKeyPath,
  getAccountTypeDir,
  getKeysBaseDir,
} from "../utils/keyPaths";

// Mock the os.homedir function
jest.mock("os", () => ({
  homedir: jest.fn(),
}));

describe("keyPaths", () => {
  const mockHomedir = "/mock/home/directory";

  beforeEach(() => {
    // Set up the mock to return a predictable home directory
    (os.homedir as jest.Mock).mockReturnValue(mockHomedir);
  });

  afterEach(() => {
    // Clear all mocks after each test
    jest.clearAllMocks();
  });

  describe("getKeysBaseDir", () => {
    it("should return the correct base directory path", () => {
      const expected = `${mockHomedir}/.zetachain/keys`;
      const result = getKeysBaseDir();

      expect(result).toBe(expected);
      expect(os.homedir).toHaveBeenCalledTimes(1);
    });
  });

  describe("getAccountTypeDir", () => {
    it("should return the correct directory for EVM account type", () => {
      const expected = `${mockHomedir}/.zetachain/keys/evm`;
      const result = getAccountTypeDir("evm");

      expect(result).toBe(expected);
      expect(os.homedir).toHaveBeenCalledTimes(1);
    });

    it("should return the correct directory for Solana account type", () => {
      const expected = `${mockHomedir}/.zetachain/keys/solana`;
      const result = getAccountTypeDir("solana");

      expect(result).toBe(expected);
      expect(os.homedir).toHaveBeenCalledTimes(1);
    });
  });

  describe("getAccountKeyPath", () => {
    it("should return the correct file path for an EVM account", () => {
      const accountName = "myaccount";
      const expected = `${mockHomedir}/.zetachain/keys/evm/${accountName}.json`;
      const result = getAccountKeyPath("evm", accountName);

      expect(result).toBe(expected);
      expect(os.homedir).toHaveBeenCalledTimes(1);
    });

    it("should return the correct file path for a Solana account", () => {
      const accountName = "myaccount";
      const expected = `${mockHomedir}/.zetachain/keys/solana/${accountName}.json`;
      const result = getAccountKeyPath("solana", accountName);

      expect(result).toBe(expected);
      expect(os.homedir).toHaveBeenCalledTimes(1);
    });
  });
});
