import { networks } from "@zetachain/networks";
import merge from "lodash/merge";

import {
  getBalances,
  getEndpoints,
  getFees,
  getForeignCoins,
  getPools,
  getSupportedChains,
  sendZETA,
  sendZRC20,
  trackCCTX,
} from ".";

interface ZetaChainClientParams {
  chains?: { [key: string]: any };
  network?: string;
}

export class ZetaChainClient {
  public chains: { [key: string]: any };
  public network: string;

  constructor(params: ZetaChainClientParams = {}) {
    this.chains = { ...networks };
    this.network = params.network || "";

    this.mergeChains(params.chains);
  }

  private mergeChains(customChains: { [key: string]: any } = {}): void {
    Object.entries(customChains).forEach(([key, value]) => {
      if (customChains.hasOwnProperty(key)) {
        this.chains[key] = merge({}, this.chains[key], value);
      }
    });
  }

  public getChains(): { [key: string]: any } {
    return this.chains;
  }

  getEndpoints = getEndpoints;
  getBalances = getBalances;
  getForeignCoins = getForeignCoins;
  getSupportedChains = getSupportedChains;
  getFees = getFees;
  getPools = getPools;
  sendZETA = sendZETA;
  sendZRC20 = sendZRC20;
  trackCCTX = trackCCTX;
}
