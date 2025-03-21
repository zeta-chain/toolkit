import { TokenBalance } from "../../../types/balances.types";
import {
  addZetaTokens,
  collectTokensFromForeignCoins,
  enrichTokens,
  getBtcBalances,
  getEvmTokenBalancesFallback,
  getEvmTokenBalancesWithMulticall,
  getNativeEvmTokenBalances,
  getSolanaBalances,
  getSplTokenBalances,
  prepareMulticallContexts,
} from "../../../utils/balances";
import { ZetaChainClient } from "./client";

/**
 * Get token balances of all tokens on all chains connected to ZetaChain.
 *
 * @param this - ZetaChainClient instance.
 * @param options.evmAddress EVM address
 * @param options.btcAddress Bitcoin address
 * @param options.solanaAddress Solana address
 * @returns Array of token balances
 */
export const getBalances = async function (
  this: ZetaChainClient,
  {
    evmAddress,
    btcAddress,
    solanaAddress,
  }: { btcAddress?: string; evmAddress?: string; solanaAddress?: string }
): Promise<TokenBalance[]> {
  const getEndpoint = (type: string, chainName: string): string =>
    this.getEndpoint(type, chainName);

  const getChains = () => this.getChains();
  const getChainId = (name: string) => this.getChainId(name);

  // Step 1: Gather data
  const zetaChainId = getChainId(`zeta_${this.network}`);
  const supportedChains = await this.getSupportedChains();
  const foreignCoins = await this.getForeignCoins();

  // Step 2: Collect and prepare tokens
  // Handle potential null values for zetaChainId
  const chainIdString =
    typeof zetaChainId === "number"
      ? zetaChainId.toString()
      : zetaChainId || "";

  // Collect and prepare all tokens in a single step
  const tokens = enrichTokens(
    [
      ...collectTokensFromForeignCoins(
        foreignCoins,
        supportedChains,
        chainIdString
      ),
      ...addZetaTokens(supportedChains, getChains(), chainIdString),
    ],
    supportedChains
  );

  // Initialize the array of balances that we'll build up
  let balances: TokenBalance[] = [];

  // Step 3: Get EVM token balances
  if (evmAddress) {
    const multicallContexts = prepareMulticallContexts(tokens, evmAddress);

    // Process each chain with multicall, falling back to individual calls if needed
    for (const chainName of Object.keys(multicallContexts)) {
      const rpc = getEndpoint("evm", chainName);
      const multicallResults = await getEvmTokenBalancesWithMulticall(
        chainName,
        rpc,
        multicallContexts[chainName],
        tokens
      );

      if (multicallResults.length > 0) {
        balances = balances.concat(multicallResults);
      } else {
        // Fallback to individual calls if multicall fails
        const individualResults = await getEvmTokenBalancesFallback(
          chainName,
          rpc,
          tokens,
          evmAddress
        );
        balances = balances.concat(individualResults);
      }
    }

    // Get native EVM token balances
    const nativeBalances = await getNativeEvmTokenBalances(
      tokens,
      evmAddress,
      getEndpoint,
      getChains()
    );
    balances = balances.concat(nativeBalances);
  }

  // Step 4: Get BTC balances
  if (btcAddress) {
    const btcBalances = await getBtcBalances(tokens, btcAddress, getEndpoint);
    balances = balances.concat(btcBalances);
  }

  // Step 5: Get Solana balances
  if (solanaAddress) {
    // Get native SOL balances
    const solBalances = await getSolanaBalances(
      tokens,
      solanaAddress,
      getEndpoint
    );
    balances = balances.concat(solBalances);

    // Get SPL token balances
    const splBalances = await getSplTokenBalances(
      tokens,
      solanaAddress,
      getEndpoint
    );
    balances = balances.concat(splBalances);
  }

  return balances;
};
