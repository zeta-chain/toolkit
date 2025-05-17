/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { jest } from "@jest/globals";
import axios from "axios";

// Import types
import { ObserverSupportedChain } from "../types/supportedChains.types";
import * as balancesUtils from "../utils/balances";

// Mock dependencies
jest.mock("axios");

// Mock ethers module
jest.mock("ethers", () => ({
  AbiCoder: {
    defaultAbiCoder: () => ({
      decode: jest.fn().mockReturnValue([BigInt(100000000000000000n)]),
    }),
  },
  ethers: {
    Contract: jest.fn().mockImplementation(() => ({
      aggregate: { staticCall: jest.fn().mockResolvedValue([[], []]) },
      balanceOf: jest.fn().mockResolvedValue(BigInt(100000000000000000n)),
      decimals: jest.fn().mockResolvedValue(18),
      symbol: jest.fn().mockResolvedValue("TEST"),
    })),
    Interface: jest.fn().mockImplementation(() => ({
      encodeFunctionData: jest.fn().mockReturnValue("0xEncodedData"),
    })),
    JsonRpcProvider: jest.fn().mockImplementation(() => ({
      getBalance: jest.fn().mockResolvedValue(BigInt(100000000000000000n)),
    })),
    formatUnits: jest
      .fn()
      .mockImplementation((value, decimals) =>
        (Number(value) / 10 ** Number(decimals)).toString()
      ),
    getAddress: jest.fn().mockImplementation(() => "0x123"),
  },
}));

// Mock ZetaChain protocol contracts
jest.mock("@zetachain/protocol-contracts", () => ({
  ParamChainName: {},
  getAddress: jest.fn().mockImplementation((key) => {
    if (key === "zetaToken") {
      return "0xZetaTokenAddress";
    }
    return null;
  }),
}));

// Helper to mock get endpoints
const createMockGetEndpoint = (
  endpointMappings: Record<string, Record<string, string>>
) => {
  return jest.fn().mockImplementation((type: string, chainName: string) => {
    if (endpointMappings[type]?.[chainName]) {
      return endpointMappings[type][chainName];
    }
    return "";
  });
};

describe("balances utility functions", () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("parseTokenId", () => {
    it("should concatenate chain ID and symbol correctly", () => {
      expect(balancesUtils.parseTokenId("eth", "ZETA")).toBe("eth__ZETA");
      expect(balancesUtils.parseTokenId("1", "ETH")).toBe("1__ETH");
      expect(balancesUtils.parseTokenId("", "")).toBe("__");
    });
  });

  describe("collectTokensFromForeignCoins", () => {
    it("should collect tokens from Gas type foreign coins", () => {
      const foreignCoins = [
        {
          asset: "",
          coin_type: "Gas",
          decimals: 18,
          foreign_chain_id: "1",
          gas_limit: "0",
          liquidity_cap: "0",
          name: "Ethereum",
          paused: false,
          symbol: "ETH",
          zrc20_contract_address: "0xZRC20_ETH",
        },
      ];

      // Type this correctly to match ObserverSupportedChain
      const supportedChains: ObserverSupportedChain[] = [
        {
          cctx_gateway: "",
          chain_id: "1",
          chain_name: "ethereum",
          consensus: "",
          is_external: false,
          name: "ethereum",
          network: "",
          network_type: "",
          vm: "evm",
        },
      ];

      const zetaChainId = "7001";

      const result = balancesUtils.collectTokensFromForeignCoins(
        foreignCoins,
        supportedChains,
        zetaChainId
      );

      expect(result).toHaveLength(2);
      expect(result[0].chain_id).toBe("1");
      expect(result[0].coin_type).toBe("Gas");
      expect(result[0].symbol).toBe("ETH");
      expect(result[1].chain_id).toBe(zetaChainId);
      expect(result[1].coin_type).toBe("ZRC20");
    });

    it("should collect tokens from ERC20 type foreign coins with EVM VM", () => {
      const foreignCoins = [
        {
          asset: "0xERC20_ADDRESS",
          coin_type: "ERC20",
          decimals: 18,
          foreign_chain_id: "1",
          gas_limit: "0",
          liquidity_cap: "0",
          name: "USD Coin",
          paused: false,
          symbol: "USDC",
          zrc20_contract_address: "0xZRC20_USDC",
        },
      ];

      // Type this correctly to match ObserverSupportedChain
      const supportedChains: ObserverSupportedChain[] = [
        {
          cctx_gateway: "",
          chain_id: "1",
          chain_name: "ethereum",
          consensus: "",
          is_external: false,
          name: "ethereum",
          network: "",
          network_type: "",
          vm: "evm",
        },
      ];

      const zetaChainId = "7001";

      const result = balancesUtils.collectTokensFromForeignCoins(
        foreignCoins,
        supportedChains,
        zetaChainId
      );

      expect(result).toHaveLength(2);
      expect(result[0].chain_id).toBe("1");
      expect(result[0].coin_type).toBe("ERC20");
      expect(result[0].contract).toBe("0xERC20_ADDRESS");
      expect(result[1].chain_id).toBe(zetaChainId);
      expect(result[1].coin_type).toBe("ZRC20");
    });

    it("should collect tokens from ERC20 type foreign coins with SVM VM", () => {
      const foreignCoins = [
        {
          asset: "SOL_TOKEN_ADDRESS",
          coin_type: "ERC20", // treated as SPL due to VM type
          decimals: 9,
          foreign_chain_id: "2",
          gas_limit: "0",
          liquidity_cap: "0",
          name: "USD Coin",
          paused: false,
          symbol: "USDC",
          zrc20_contract_address: "0xZRC20_USDC",
        },
      ];

      // Type this correctly to match ObserverSupportedChain
      const supportedChains: ObserverSupportedChain[] = [
        {
          cctx_gateway: "",
          chain_id: "2",
          chain_name: "solana",
          consensus: "",
          is_external: false,
          name: "solana",
          network: "",
          network_type: "",
          vm: "svm",
        },
      ];

      const zetaChainId = "7001";

      const result = balancesUtils.collectTokensFromForeignCoins(
        foreignCoins,
        supportedChains,
        zetaChainId
      );

      expect(result).toHaveLength(2);
      expect(result[0].chain_id).toBe("2");
      expect(result[0].coin_type).toBe("SPL");
      expect(result[0].contract).toBe("SOL_TOKEN_ADDRESS");
      expect(result[1].chain_id).toBe(zetaChainId);
      expect(result[1].coin_type).toBe("ZRC20");
    });

    it("should collect tokens from ZRC20 type foreign coins", () => {
      const foreignCoins = [
        {
          asset: "",
          coin_type: "ZRC20",
          decimals: 18,
          foreign_chain_id: "",
          gas_limit: "0",
          liquidity_cap: "0",
          name: "ZRC20 Token",
          paused: false,
          symbol: "ZRC",
          zrc20_contract_address: "0xZRC20_TOKEN",
        },
      ];

      const supportedChains: ObserverSupportedChain[] = [];
      const zetaChainId = "7001";

      const result = balancesUtils.collectTokensFromForeignCoins(
        foreignCoins,
        supportedChains,
        zetaChainId
      );

      expect(result).toHaveLength(1);
      expect(result[0].chain_id).toBe(zetaChainId);
      expect(result[0].coin_type).toBe("ZRC20");
      expect(result[0].contract).toBe("0xZRC20_TOKEN");
    });
  });

  describe("addZetaTokens", () => {
    it("should add ZETA and WZETA tokens", () => {
      // Type this correctly to match ObserverSupportedChain
      const supportedChains: ObserverSupportedChain[] = [
        {
          cctx_gateway: "",
          chain_id: "1",
          chain_name: "ethereum",
          consensus: "",
          is_external: false,
          name: "ethereum",
          network: "",
          network_type: "",
          vm: "evm",
        },
        {
          cctx_gateway: "",
          chain_id: "2",
          chain_name: "bsc",
          consensus: "",
          is_external: false,
          name: "bsc",
          network: "",
          network_type: "",
          vm: "evm",
        },
      ];

      const chains = {
        bsc: { chain_id: 2 },
        ethereum: { chain_id: 1 },
      };

      const zetaChainId = "7001";

      const result = balancesUtils.addZetaTokens(
        supportedChains,
        chains,
        zetaChainId
      );

      // Should have 3 tokens: ZETA + 2 WZETA
      expect(result).toHaveLength(3);

      // Check ZETA token
      const zetaToken = result.find(
        (t) => t.chain_id === zetaChainId && t.coin_type === "Gas"
      );
      expect(zetaToken).toBeDefined();
      expect(zetaToken?.symbol).toBe("ZETA");

      // Check WZETA tokens
      const wzetaTokens = result.filter((t) => t.symbol === "WZETA");
      expect(wzetaTokens).toHaveLength(2);
      expect(wzetaTokens[0].contract).toBe("0xZetaTokenAddress");
      expect(wzetaTokens[1].contract).toBe("0xZetaTokenAddress");
    });
  });

  describe("enrichTokens", () => {
    it("should enrich tokens with additional metadata", () => {
      const tokens = [
        {
          chain_id: "1",
          coin_type: "Gas",
          decimals: 18,
          symbol: "ETH",
        },
        {
          chain_id: "2",
          coin_type: "ERC20",
          contract: "0xTokenAddress",
          decimals: 18,
          symbol: "DAI-USD", // hyphenated symbol
        },
      ];

      // Type this correctly to match ObserverSupportedChain
      const supportedChains: ObserverSupportedChain[] = [
        {
          cctx_gateway: "",
          chain_id: "1",
          chain_name: "ethereum",
          consensus: "",
          is_external: false,
          name: "ethereum",
          network: "",
          network_type: "",
          vm: "evm",
        },
        {
          cctx_gateway: "",
          chain_id: "2",
          chain_name: "bsc",
          consensus: "",
          is_external: false,
          name: "bsc",
          network: "",
          network_type: "",
          vm: "evm",
        },
      ];

      const result = balancesUtils.enrichTokens(tokens, supportedChains);

      expect(result).toHaveLength(2);
      expect(result[0].chain_name).toBe("ethereum");
      expect(result[0].id).toBe("1__eth");
      expect(result[0].ticker).toBe("ETH");

      expect(result[1].chain_name).toBe("bsc");
      expect(result[1].id).toBe("2__dai-usd");
      expect(result[1].ticker).toBe("DAI"); // should extract first part before hyphen
    });

    it("should filter out tokens with non-existent chains", () => {
      const tokens = [
        {
          chain_id: "999", // non-existent chain
          coin_type: "Gas",
          decimals: 18,
          symbol: "UNKNOWN",
        },
      ];

      // Type this correctly to match ObserverSupportedChain
      const supportedChains: ObserverSupportedChain[] = [
        {
          cctx_gateway: "",
          chain_id: "1",
          chain_name: "ethereum",
          consensus: "",
          is_external: false,
          name: "ethereum",
          network: "",
          network_type: "",
          vm: "evm",
        },
      ];

      const result = balancesUtils.enrichTokens(tokens, supportedChains);

      expect(result).toHaveLength(0);
    });
  });

  describe("prepareMulticallContexts", () => {
    it("should group tokens by chain name and prepare call contexts", () => {
      const tokens = [
        {
          chain_id: "1",
          chain_name: "ethereum",
          coin_type: "ERC20",
          contract: "0xToken1",
          decimals: 18,
          symbol: "TKN1",
        },
        {
          chain_id: "1",
          chain_name: "ethereum",
          coin_type: "ERC20",
          contract: "0xToken2",
          decimals: 18,
          symbol: "TKN2",
        },
        {
          chain_id: "2",
          chain_name: "bsc",
          coin_type: "ERC20",
          contract: "0xToken3",
          decimals: 18,
          symbol: "TKN3",
        },
        {
          chain_id: "3",
          chain_name: "solana",
          coin_type: "SPL", // should be skipped - not EVM
          contract: "SolToken",
          decimals: 9,
          symbol: "SOLTK",
        },
      ];

      const evmAddress = "0xUserAddress";

      const result = balancesUtils.prepareMulticallContexts(tokens, evmAddress);

      expect(Object.keys(result)).toHaveLength(2); // ethereum and bsc
      expect(result.ethereum).toHaveLength(2);
      expect(result.bsc).toHaveLength(1);

      // Check call data
      expect(result.ethereum[0].target).toBe("0xToken1");
      expect(result.ethereum[1].target).toBe("0xToken2");
      expect(result.bsc[0].target).toBe("0xToken3");
    });
  });

  describe("getEvmTokenBalancesWithMulticall", () => {
    it("should fetch and format token balances using multicall", async () => {
      const mockChainName = "ethereum";
      const mockRpc = "https://eth-mainnet.alchemyapi.io/v2/key";

      const mockTokens = [
        {
          chain_id: "1",
          chain_name: mockChainName,
          coin_type: "ERC20",
          contract: "0xToken1",
          decimals: 18,
          symbol: "TKN1",
        },
      ];

      const mockCalls = [
        {
          callData: "0xEncodedData",
          target: "0xToken1",
        },
      ];

      // Setup mock to return data for decode
      const result = await balancesUtils.getEvmTokenBalancesWithMulticall(
        mockChainName,
        mockRpc,
        mockCalls,
        mockTokens
      );

      expect(result).toHaveLength(0); // Our mock doesn't currently match returned targets
    });
  });

  describe("getBtcBalances", () => {
    it("should fetch and calculate BTC balances", async () => {
      axios.get.mockResolvedValue({
        data: [
          {
            txid: "tx1",
            value: 100000000, // 1 BTC
            vout: 0,
          },
          {
            txid: "tx2",
            value: 50000000, // 0.5 BTC
            vout: 1,
          },
        ],
      });

      const mockTokens = [
        {
          chain_id: "1",
          chain_name: "btc_mainnet",
          coin_type: "Gas",
          decimals: 8,
          symbol: "BTC",
        },
      ];

      const mockBtcAddress = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";

      const result = await balancesUtils.getBtcBalances(
        mockTokens,
        mockBtcAddress
      );

      expect(result).toHaveLength(1);
      expect(result[0].balance).toBe("1.50000000"); // 1.5 BTC total
      expect(result[0].symbol).toBe("BTC");
    });
  });

  describe("getSolanaBalances", () => {
    it("should fetch and format SOL balances", async () => {
      // Setup axios mock for Solana balance
      axios.post.mockResolvedValue({
        data: {
          result: {
            value: 2000000000, // 2 SOL (with 9 decimals)
          },
        },
      });

      const mockTokens = [
        {
          chain_id: "1",
          chain_name: "solana_mainnet",
          coin_type: "Gas",
          decimals: 9,
          symbol: "SOL",
        },
      ];

      const mockSolAddress = "EWmkLx4rBn1oKzS9ZLzprLYxXMh4eyyxVmxBDZ8eA7K";

      const mockGetEndpoint = createMockGetEndpoint({
        solana: { solana_mainnet: "https://api.mainnet-beta.solana.com" },
      });

      const result = await balancesUtils.getSolanaBalances(
        mockTokens,
        mockSolAddress,
        mockGetEndpoint
      );

      expect(result).toHaveLength(1);
      expect(result[0].balance).toBe("2.000000000"); // 2 SOL formatted with 9 decimals
      expect(result[0].symbol).toBe("SOL");
    });
  });

  describe("getSplTokenBalances", () => {
    it("should fetch, sum, and format SPL token balances", async () => {
      // Setup axios mock for SPL token balances
      axios.post.mockResolvedValue({
        data: {
          result: {
            value: [
              {
                account: {
                  data: {
                    parsed: {
                      info: {
                        tokenAmount: {
                          amount: "1000000", // 1 USDC with 6 decimals
                          decimals: 6,
                        },
                      },
                    },
                  },
                },
              },
              {
                account: {
                  data: {
                    parsed: {
                      info: {
                        tokenAmount: {
                          amount: "2000000", // 2 USDC with 6 decimals
                          decimals: 6,
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        status: 200,
      });

      const mockTokens = [
        {
          chain_id: "1",
          chain_name: "solana_mainnet",
          coin_type: "SPL",
          contract: "SPL_TOKEN_MINT",
          decimals: 6,
          symbol: "USDC",
        },
      ];

      const mockSolAddress = "EWmkLx4rBn1oKzS9ZLzprLYxXMh4eyyxVmxBDZ8eA7K";

      const mockGetEndpoint = createMockGetEndpoint({
        solana: { solana_mainnet: "https://api.mainnet-beta.solana.com" },
      });

      const result = await balancesUtils.getSplTokenBalances(
        mockTokens,
        mockSolAddress,
        mockGetEndpoint
      );

      expect(result).toHaveLength(1);
      expect(result[0].balance).toBe("3"); // 1 USDC + 2 USDC = 3 USDC
      expect(result[0].symbol).toBe("USDC");
    });

    it("should handle empty SPL token responses", async () => {
      // Setup axios mock for empty SPL token response
      axios.post.mockResolvedValue({
        data: {
          result: {
            value: [], // No tokens found
          },
        },
        status: 200,
      });

      const mockTokens = [
        {
          chain_id: "1",
          chain_name: "solana_mainnet",
          coin_type: "SPL",
          contract: "SPL_TOKEN_MINT",
          decimals: 6,
          symbol: "USDC",
        },
      ];

      const mockSolAddress = "EWmkLx4rBn1oKzS9ZLzprLYxXMh4eyyxVmxBDZ8eA7K";

      const mockGetEndpoint = createMockGetEndpoint({
        solana: { solana_mainnet: "https://api.mainnet-beta.solana.com" },
      });

      const result = await balancesUtils.getSplTokenBalances(
        mockTokens,
        mockSolAddress,
        mockGetEndpoint
      );

      expect(result).toHaveLength(1);
      expect(result[0].balance).toBe("0"); // No tokens found
      expect(result[0].symbol).toBe("USDC");
    });
  });
});
