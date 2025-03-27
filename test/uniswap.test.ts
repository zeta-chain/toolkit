import { ForeignCoin } from "../types/foreignCoins.types";
import { Pool } from "../types/pools.types";
import {
  formatPoolsWithTokenDetails,
  generateUniquePairs,
} from "../utils/uniswap";

describe("generateUniquePairs", () => {
  it("should generate unique pairs from a list of token addresses", () => {
    const tokenAddresses = ["0xA", "0xB", "0xC"];

    const result = generateUniquePairs(tokenAddresses);

    // We should have 3 unique pairs: A-B, A-C, B-C
    expect(result).toHaveLength(3);

    // Check that each pair has the tokens sorted alphabetically in the key
    expect(result[0].key).toBe(["0xA", "0xB"].sort().join("-"));
    expect(result[1].key).toBe(["0xA", "0xC"].sort().join("-"));
    expect(result[2].key).toBe(["0xB", "0xC"].sort().join("-"));

    // Check that the actual tokens are correctly assigned
    expect(result).toEqual(
      expect.arrayContaining([
        { key: ["0xA", "0xB"].sort().join("-"), tokenA: "0xA", tokenB: "0xB" },
        { key: ["0xA", "0xC"].sort().join("-"), tokenA: "0xA", tokenB: "0xC" },
        { key: ["0xB", "0xC"].sort().join("-"), tokenA: "0xB", tokenB: "0xC" },
      ])
    );
  });

  it("should return an empty array when given less than 2 token addresses", () => {
    expect(generateUniquePairs(["0xA"])).toHaveLength(0);
    expect(generateUniquePairs([])).toHaveLength(0);
  });

  it("should handle duplicates in token addresses list", () => {
    const tokenAddresses = [
      "0xA",
      "0xA", // Duplicate
      "0xB",
    ];

    const result = generateUniquePairs(tokenAddresses);

    // The function creates pairs including self-pairs (A-A) as well as the A-B pair
    expect(result).toHaveLength(2);

    // Check keys for all pairs
    const keys = result.map((pair) => pair.key);
    expect(keys).toContain("0xA-0xA");
    expect(keys).toContain("0xA-0xB");

    // Verify specific pairs
    expect(result).toEqual(
      expect.arrayContaining([
        { key: "0xA-0xA", tokenA: "0xA", tokenB: "0xA" },
        { key: "0xA-0xB", tokenA: "0xA", tokenB: "0xB" },
      ])
    );
  });
});

describe("formatPoolsWithTokenDetails", () => {
  const mockZetaTokenAddress = "0xZETA";

  const mockForeignCoins: ForeignCoin[] = [
    {
      asset: "toka",
      coin_type: "ERC20",
      decimals: 6,
      foreign_chain_id: "eth",
      gas_limit: "100000",
      liquidity_cap: "1000000",
      name: "Token A",
      paused: false,
      symbol: "TOKA",
      zrc20_contract_address: "0xA",
    },
    {
      asset: "tokb",
      coin_type: "ERC20",
      decimals: 18,
      foreign_chain_id: "bsc",
      gas_limit: "100000",
      liquidity_cap: "1000000",
      name: "Token B",
      paused: false,
      symbol: "TOKB",
      zrc20_contract_address: "0xB",
    },
  ];

  const mockPools: Pool[] = [
    {
      pair: "0xPAIR1",
      t0: {
        address: "0xA",
        reserve: BigInt(1000000),
      },
      t1: {
        address: mockZetaTokenAddress,
        reserve: BigInt(2000000),
      },
    },
    {
      pair: "0xPAIR2",
      t0: {
        address: "0xB",
        reserve: BigInt(3000000),
      },
      t1: {
        address: "0xA",
        reserve: BigInt(4000000),
      },
    },
  ];

  it("should format pools with token details", () => {
    const result = formatPoolsWithTokenDetails(
      mockPools,
      mockForeignCoins,
      mockZetaTokenAddress
    );

    // Check that token details are added for all tokens
    expect(result).toHaveLength(2);

    // Check first pool
    expect(result[0].t0.symbol).toBe("TOKA");
    expect(result[0].t0.decimals).toBe(6);
    expect(result[0].t1.symbol).toBe("WZETA");
    expect(result[0].t1.decimals).toBe(18);

    // Check second pool
    expect(result[1].t0.symbol).toBe("TOKB");
    expect(result[1].t0.decimals).toBe(18);
    expect(result[1].t1.symbol).toBe("TOKA");
    expect(result[1].t1.decimals).toBe(6);

    // Original data should be preserved
    expect(result[0].t0.reserve).toBe(BigInt(1000000));
    expect(result[0].t1.reserve).toBe(BigInt(2000000));
    expect(result[1].t0.reserve).toBe(BigInt(3000000));
    expect(result[1].t1.reserve).toBe(BigInt(4000000));
  });

  it("should handle unknown tokens without crashing", () => {
    const poolsWithUnknownToken: Pool[] = [
      {
        pair: "0xPAIR3",
        t0: {
          address: "0xUNKNOWN",
          reserve: BigInt(5000000),
        },
        t1: {
          address: "0xA",
          reserve: BigInt(6000000),
        },
      },
    ];

    const result = formatPoolsWithTokenDetails(
      poolsWithUnknownToken,
      mockForeignCoins,
      mockZetaTokenAddress
    );

    // Should still return a result
    expect(result).toHaveLength(1);

    // Unknown token should have empty details
    expect(result[0].t0.symbol).toBeUndefined();
    expect(result[0].t0.decimals).toBeUndefined();

    // Known token should have details
    expect(result[0].t1.symbol).toBe("TOKA");
    expect(result[0].t1.decimals).toBe(6);
  });

  it("should handle case sensitivity in addresses", () => {
    const poolsWithMixedCaseAddresses: Pool[] = [
      {
        pair: "0xPAIR4",
        t0: {
          address: mockZetaTokenAddress.toUpperCase(), // Different case
          reserve: BigInt(7000000),
        },
        t1: {
          address: "0xa", // Lowercase version of 0xA
          reserve: BigInt(8000000),
        },
      },
    ];

    const result = formatPoolsWithTokenDetails(
      poolsWithMixedCaseAddresses,
      mockForeignCoins,
      mockZetaTokenAddress
    );

    // Should correctly match tokens despite case differences
    expect(result[0].t0.symbol).toBe("WZETA");
    expect(result[0].t0.decimals).toBe(18);
    expect(result[0].t1.symbol).toBe("TOKA");
    expect(result[0].t1.decimals).toBe(6);
  });
});
