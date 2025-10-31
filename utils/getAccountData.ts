import {
  AccountData,
  accountDataSchema,
  AvailableAccountTypes,
  BitcoinAccountData,
  EVMAccountData,
  SolanaAccountData,
  SuiAccountData,
  TONAccountData,
} from "../types/accounts.types";
import { safeExists, safeReadFile } from "./fsUtils";
import { getAccountKeyPath } from "./keyPaths";
import { parseJson } from "./parseJson";

/**
 * Check if an account exists by name and type
 */
export const accountExists = (
  accountType: (typeof AvailableAccountTypes)[number],
  accountName?: string
): boolean => {
  if (!accountName) return false;
  const keyPath = getAccountKeyPath(accountType, accountName);
  return safeExists(keyPath);
};

/**
 * Get account data by name and type
 */
export const getAccountData = <
  T extends
    | EVMAccountData
    | SolanaAccountData
    | BitcoinAccountData
    | SuiAccountData
    | TONAccountData
>(
  accountType: (typeof AvailableAccountTypes)[number],
  accountName: string
): T | undefined => {
  const keyPath = getAccountKeyPath(accountType, accountName);

  if (!safeExists(keyPath)) {
    return undefined;
  }

  try {
    const keyData = parseJson(safeReadFile(keyPath), accountDataSchema);
    return keyData as T;
  } catch {
    return undefined;
  }
};
