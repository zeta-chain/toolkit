import { QueryAllForeignCoinsResponseSDKType } from "@zetachain/sdk-cosmos/zetachain/zetacore/fungible/query";
import axios from "axios";

import { ZetaChainClient } from "./client";

export const getForeignCoins = async function (this: ZetaChainClient) {
  const api = this.getEndpoint("cosmos-http", `zeta_${this.network}`);
  const endpoint = `${api}/zeta-chain/fungible/foreign_coins`;
  const { data } = await axios.get<QueryAllForeignCoinsResponseSDKType>(
    endpoint
  );

  return data.foreignCoins;
};
