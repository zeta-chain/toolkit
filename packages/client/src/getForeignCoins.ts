import axios from "axios";

import { ForeignCoinsResponse } from "../../../types/foreignCoins.types";
import { ZetaChainClient } from "./client";

export const getForeignCoins = async function (this: ZetaChainClient) {
  const api = this.getEndpoint("cosmos-http", `zeta_${this.network}`);
  const endpoint = `${api}/zeta-chain/fungible/foreign_coins`;
  const { data } = await axios.get<ForeignCoinsResponse>(endpoint);

  return data.foreignCoins;
};
