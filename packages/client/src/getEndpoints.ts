import { ZetaChainClient } from "./client";

export const getEndpoints = function (
  this: ZetaChainClient,
  type: any,
  network: any
) {
  if (!(this.chains as any)[network]) {
    throw new Error(`Network ${network} does not exist.`);
  }

  return (this.chains as any)[network].api.filter(
    (api: any) => api.type === type
  )[0]?.url;
};