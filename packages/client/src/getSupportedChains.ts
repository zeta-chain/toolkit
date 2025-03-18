import axios from "axios";

import { ObserverSupportedChainsResponse } from "../../../types/supportedChains.types";
import { ZetaChainClient } from "./client";

export const getSupportedChains = async function (this: ZetaChainClient) {
  const api = this.getEndpoint("cosmos-http", `zeta_${this.network}`);
  const endpoint = `${api}/zeta-chain/observer/supportedChains`;
  const { data } = await axios.get<ObserverSupportedChainsResponse>(endpoint);

  return data.chains;
};
