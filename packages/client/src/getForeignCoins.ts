import { ZetaChainClient } from "./client";

export const getForeignCoins = async function (this: ZetaChainClient) {
  const api = await this.getEndpoint("cosmos-http", `zeta_${this.network}`);
  const endpoint = `${api}/zeta-chain/fungible/foreign_coins`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data.foreignCoins;
};
