import { ZetaChainClient } from "./client";

export async function getForeignCoins(this: ZetaChainClient) {
  const api = await this.getEndpoints("cosmos-http", `zeta_${this.network}`);
  const endpoint = `${api}/zeta-chain/fungible/foreign_coins`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data.foreignCoins;
}
