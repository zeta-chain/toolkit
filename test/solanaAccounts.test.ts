import {
  dependencies,
  parseSolanaAccount,
  parseSolanaAccounts,
  solanaAccountStringSchema,
} from "../utils/solanaAccounts";

// Mock the dependencies directly instead of using jest.mock
beforeEach(() => {
  // Create a mock class for PublicKey
  class MockPublicKey {
    private value: string;

    constructor(value: string) {
      // Very basic validation - in real Solana, this would be more complex
      if (typeof value !== "string" || value.length < 32) {
        throw new Error("Invalid public key input");
      }
      this.value = value;
    }

    toBytes() {
      return new Uint8Array(32).fill(1);
    }

    toString() {
      return this.value;
    }
  }

  // Create mock functions
  const mockHexlify = jest
    .fn()
    .mockReturnValue(
      "0x0101010101010101010101010101010101010101010101010101010101010101"
    );

  // Override the dependencies for testing
  dependencies.anchor = {
    web3: {
      PublicKey: MockPublicKey,
    },
  } as unknown as typeof dependencies.anchor;

  dependencies.ethers = {
    hexlify: mockHexlify,
  } as unknown as typeof dependencies.ethers;
});

const validPubkey = "6ipJvT1Q2S9HgpsxdzhAsE1mErG8wDRzxsRfrPJUANFi";

describe("solanaAccountStringSchema", () => {
  it("should validate and transform a correct account string", () => {
    const result = solanaAccountStringSchema.safeParse(`${validPubkey}:true`);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        isWritableStr: true,
        pubkey: validPubkey,
      });
    }
  });

  it('should transform "false" to boolean false', () => {
    const result = solanaAccountStringSchema.safeParse(`${validPubkey}:false`);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isWritableStr).toBe(false);
    }
  });

  it("should reject strings without a colon", () => {
    const result = solanaAccountStringSchema.safeParse(validPubkey);
    expect(result.success).toBe(false);
  });

  it("should reject strings with multiple colons", () => {
    const result = solanaAccountStringSchema.safeParse(
      `${validPubkey}:true:extra`
    );
    expect(result.success).toBe(false);
  });

  it("should reject invalid isWritable values", () => {
    const result = solanaAccountStringSchema.safeParse(`${validPubkey}:yes`);
    expect(result.success).toBe(false);
  });

  it("should reject invalid public keys", () => {
    const result = solanaAccountStringSchema.safeParse("invalid:true");
    expect(result.success).toBe(false);
  });
});

describe("parseSolanaAccount", () => {
  it("should correctly parse a valid account string with true", () => {
    const result = parseSolanaAccount(`${validPubkey}:true`);

    expect(result).toEqual({
      isWritable: true,
      publicKey:
        "0x0101010101010101010101010101010101010101010101010101010101010101",
    });
  });

  it("should correctly parse a valid account string with false", () => {
    const result = parseSolanaAccount(`${validPubkey}:false`);

    expect(result).toEqual({
      isWritable: false,
      publicKey:
        "0x0101010101010101010101010101010101010101010101010101010101010101",
    });
  });

  it("should throw an error for an invalid format", () => {
    expect(() => parseSolanaAccount("invalid-format")).toThrow();
  });

  it("should include the index in error messages when provided", () => {
    try {
      parseSolanaAccount("invalid-format", 2);
      fail("Should have thrown an error");
    } catch (error) {
      expect((error as Error).message).toContain("at index 2");
    }
  });
});

describe("parseSolanaAccounts", () => {
  it("should parse an array of valid account strings", () => {
    const accounts = [`${validPubkey}:true`, `${validPubkey}:false`];

    const result = parseSolanaAccounts(accounts);

    expect(result).toHaveLength(2);
    expect(result[0].isWritable).toBe(true);
    expect(result[1].isWritable).toBe(false);
  });

  it("should throw an error with the correct index for invalid accounts", () => {
    const accounts = [
      `${validPubkey}:true`,
      "invalid-format",
      `${validPubkey}:false`,
    ];

    expect(() => parseSolanaAccounts(accounts)).toThrow(/at index 1/);
  });
});
