import { networks } from "@zetachain/networks";
import merge from "lodash/merge";

import { getBalances } from "./balances";
import { getFees } from "./fees";
import { getPools } from "./pools";
import { sendZETA } from "./sendZETA";
import { sendZRC20 } from "./sendZRC20";
import { getForeignCoins } from "./getForeignCoins";
import { getEndpoints } from "./getEndpoints";
import { getSupportedChains } from "./getSupportedChains";
import { trackCCTX } from "./trackCCTX";

export class ZetaChainClient {
  public chains: any;
  public network: any;

  constructor(params: any = { chains: {}, network: "" }) {
    const mergeChains = (customChains: any): void => {
      for (const key in customChains) {
        if (customChains.hasOwnProperty(key)) {
          this.chains[key] = merge({}, this.chains[key], customChains[key]);
        }
      }
    };
    this.chains = { ...networks };
    this.network = params.network;

    mergeChains(params.chains);
  }

  public getChains(): any {
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
