import fs from "fs";
import os from "os";
import path from "path";

import { AvailableAccountTypes } from "../types/accounts.types";

/**
 * Base directory for all account keys
 */
export const getKeysBaseDir = (): string => {
  return path.join(os.homedir(), ".zetachain", "keys");
};

/**
 * Get the directory for a specific account type
 * @param type Account type (evm, solana, etc.)
 * @returns Directory path for the specified account type
 */
export const getAccountTypeDir = (
  type: (typeof AvailableAccountTypes)[number]
): string => {
  return path.join(getKeysBaseDir(), type);
};

/**
 * Get the file path for a specific account
 * @param type Account type (evm, solana, etc.)
 * @param name Account name
 * @returns File path for the specified account
 */
export const getAccountKeyPath = (
  type: (typeof AvailableAccountTypes)[number],
  name: string
): string => {
  return path.join(getAccountTypeDir(type), `${name}.json`);
};

export const readKeyFromStore = (keyName: string): string => {
  const keyPath = getAccountKeyPath("evm", keyName);
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Key file not found at ${keyPath}`);
  }
  const keyData = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
  if (!keyData.privateKey) {
    throw new Error(`Private key not found in key file ${keyPath}`);
  }
  return keyData.privateKey;
};
