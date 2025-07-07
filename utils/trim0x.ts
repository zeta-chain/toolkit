/**
 * Helper function to trim the '0x' prefix from a hex string
 * @param hexString - The hex string to trim
 * @returns The hex string without the '0x' prefix
 */
export const trim0x = (hexString: string): string => {
  return hexString.startsWith("0x") ? hexString.slice(2) : hexString;
};
