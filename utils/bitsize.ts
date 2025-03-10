const VALID_BIT_SIZES = [
  8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 128, 136, 144,
  152, 160, 168, 176, 184, 192, 200, 208, 216, 224, 232, 240, 248, 256,
];

export const isValidBitSize = (bitSize: number): boolean => {
  return VALID_BIT_SIZES.includes(bitSize);
};

const INT_TYPE_PATTERN = /^(u?int)(\d+)$/;

export const getBitSize = (type: string): number | null => {
  const match = type.match(INT_TYPE_PATTERN);
  if (match) {
    return parseInt(match[2], 10); // Extract the number suffix
  }
  return null; // No bit size found (e.g., "int" or "uint")
};
