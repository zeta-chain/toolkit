import { toBigInt } from "ethers";

/**
 * Compares a bigint and a number for equality.
 * @param bigIntValue - The bigint value to compare.
 * @param numberValue - The number value to compare.
 * @returns True if the values are equal, false otherwise.
 * @throws Error if the number value is not an integer or outside the safe integer range.
 */
export const compareBigIntAndNumber = (
  bigIntValue: bigint,
  numberValue: number
): boolean => {
  // Ensure the number is an integer
  if (!Number.isInteger(numberValue)) {
    throw new Error("The number value must be an integer.");
  }

  // Ensure the number is within the safe integer range
  if (
    numberValue > Number.MAX_SAFE_INTEGER ||
    numberValue < Number.MIN_SAFE_INTEGER
  ) {
    throw new Error("The number value is outside the safe integer range.");
  }

  // Ensure the bigIntValue is actually a bigint
  if (typeof bigIntValue !== "bigint") {
    throw new Error("The bigIntValue must be of type bigint.");
  }

  // Convert the number to a bigint using ethers.js
  const numberAsBigInt = toBigInt(numberValue);

  // Compare the values
  return bigIntValue === numberAsBigInt;
};
