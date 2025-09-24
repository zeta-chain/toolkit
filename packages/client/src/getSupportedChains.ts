import axios from "axios";
import { QuerySupportedChainsResponseSDKType } from "@zetachain/sdk-cosmos/zetachain/zetacore/observer/query";

import { ZetaChainClient } from "./client";

export const getSupportedChains = async function (this: ZetaChainClient) {
  const api = this.getEndpoint("cosmos-http", `zeta_${this.network}`);
  const endpoint = `${api}/zeta-chain/observer/supportedChains`;
  const { data } = await axios.get<QuerySupportedChainsResponseSDKType>(
    endpoint
  );

  return data.chains;
};
