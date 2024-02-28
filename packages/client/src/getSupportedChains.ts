import { ZetaChainClient } from "./client";

export const getSupportedChains = async function (this: ZetaChainClient) {
  const api = await this.getEndpoint("cosmos-http", `zeta_${this.network}`);
  const endpoint = `${api}/zeta-chain/observer/supportedChains`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data.chains;
};
