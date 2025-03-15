import has from "lodash/has";

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
  if (has(networks, chainNameOrAlias)) {
    return networks[chainNameOrAlias].chain_id;
  }

  // Iterate through networks to check aliases
  for (const key in networks) {
    if (has(networks, key)) {
      const chain = networks[key];

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
