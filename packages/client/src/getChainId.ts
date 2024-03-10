import { ZetaChainClient } from "./client";

/**
 * Get chain ID from a chain label.
 *
 * @param this - ZetaChainClient instance.
 * @param chainNameOrAlias Chain label like goerli_testnet
 * @returns
 */
export const getChainId = function (
  this: ZetaChainClient,
  chainNameOrAlias: string
): number | null {
  const networks = this.chains;
  if (networks.hasOwnProperty(chainNameOrAlias)) {
    return networks[chainNameOrAlias as keyof typeof networks].chain_id;
  }

  // Iterate through networks to check aliases
  for (const key in networks) {
    if (networks.hasOwnProperty(key)) {
      const chain: any = networks[key as keyof typeof networks];
      if (
        chain.chain_aliases &&
        chain.chain_aliases.includes(chainNameOrAlias)
      ) {
        return chain.chain_id;
      }
    }
  }

  return null;
};
