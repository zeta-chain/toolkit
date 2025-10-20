import { TokenBalance } from "../../../types/balances.types";
import { ObserverSupportedChain } from "../../../types/supportedChains.types";
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
  getSuiBalances,
  getTonBalances,
  prepareMulticallContexts,
} from "../../../utils/balances";
import { getRpcUrl } from "../../../utils/chains";
import { ZetaChainClient } from "./client";

/**
 * Get token balances of all tokens on all chains connected to ZetaChain.
 *
 * @param this - ZetaChainClient instance.
 * @param options.evmAddress EVM address
 * @param options.btcAddress Bitcoin address
 * @param options.solanaAddress Solana address
 * @param options.suiAddress Sui address
 * @param options.tonAddress TON address
 * @returns Array of token balances
 */
export const getBalances = async function (
  this: ZetaChainClient,
  {
    evmAddress,
    btcAddress,
    solanaAddress,
    suiAddress,
    tonAddress,
  }: {
    btcAddress?: string;
    evmAddress?: string;
    solanaAddress?: string;
    suiAddress?: string;
    tonAddress?: string;
  }
): Promise<TokenBalance[]> {
  const foreignCoins = await this.getForeignCoins();
  const supportedChains = await this.getSupportedChains();
  const zetaChainId = this.getChainId(`zeta_${this.network}`);
  if (!zetaChainId) {
    throw new Error("Failed to get ZetaChain ID");
  }
  const chainIdString = zetaChainId.toString();

  const tokens = collectTokensFromForeignCoins(
    foreignCoins,
    supportedChains,
    chainIdString
  );
  const zetaTokens = addZetaTokens(supportedChains, this.chains, chainIdString);
  const allTokens = enrichTokens([...tokens, ...zetaTokens], supportedChains);

  const balances: TokenBalance[] = [];

  // Get EVM token balances
  if (evmAddress) {
    const evmTokens = allTokens.filter(
      (token) =>
        token.chain_name &&
        supportedChains.find(
          (chain: ObserverSupportedChain) => chain.name === token.chain_name
        )?.vm === "evm"
    );

    const multicallContexts = prepareMulticallContexts(evmTokens, evmAddress);

    for (const [chainName, contexts] of Object.entries(multicallContexts)) {
      const chain = supportedChains.find(
        (c: ObserverSupportedChain) => c.name === chainName
      );
      if (!chain) continue;

      const rpc = getRpcUrl(parseInt(chain.chain_id));
      let chainBalances: TokenBalance[];

      try {
        chainBalances = await getEvmTokenBalancesWithMulticall(
          chainName,
          rpc,
          contexts,
          evmTokens
        );
      } catch (error) {
        console.error(
          `Multicall failed for ${chainName}, falling back to individual calls:`,
          error
        );
        chainBalances = await getEvmTokenBalancesFallback(
          chainName,
          rpc,
          evmTokens,
          evmAddress
        );
      }

      balances.push(...chainBalances);
    }

    // Get native EVM token balances
    const nativeBalances = await getNativeEvmTokenBalances(
      allTokens,
      evmAddress,
      this.getEndpoint.bind(this),
      this.chains
    );
    balances.push(...nativeBalances);
  }

  // Get Bitcoin balances
  if (btcAddress) {
    const btcBalances = await getBtcBalances(allTokens, btcAddress);
    balances.push(...btcBalances);
  }

  // Get Solana balances
  if (solanaAddress) {
    const solanaBalances = await getSolanaBalances(
      allTokens,
      solanaAddress,
      this.getEndpoint.bind(this)
    );
    balances.push(...solanaBalances);

    const splBalances = await getSplTokenBalances(
      allTokens,
      solanaAddress,
      this.getEndpoint.bind(this)
    );
    balances.push(...splBalances);
  }

  // Get Sui balances
  if (suiAddress) {
    const suiBalances = await getSuiBalances(allTokens, suiAddress);
    balances.push(...suiBalances);
  }

  // Get TON balances
  if (tonAddress) {
    const tonBalances = await getTonBalances(allTokens, tonAddress);
    balances.push(...tonBalances);
  }

  return balances;
};
