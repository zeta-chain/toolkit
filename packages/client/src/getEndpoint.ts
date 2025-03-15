import { ZetaChainClient } from "./client";

export const getEndpoint = function (
  this: ZetaChainClient,
  type: string,
  network: string
) {
  const chain = this.chains[network];

  if (!chain) {
    throw new Error(`Network ${network} does not exist.`);
  }

  if (!chain.api) {
    throw new Error(`Network ${network} does not have an api property.`);
  }

  const firstChainApiUrlByType = chain.api.filter(
    (api) => api.type === type
  )?.[0]?.url;

  if (!firstChainApiUrlByType) {
    throw new Error(`Network ${network} does not have api for ${type}.`);
  }

  return firstChainApiUrlByType;
};
