import { networks } from "@zetachain/networks";
import merge from "lodash/merge";
import type { Wallet } from "ethers";

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
  deposit,
} from ".";

interface ZetaChainClientParams {
  chains?: { [key: string]: any };
  network?: string;
  wallet?: any;
  provider?: any;
}

export class ZetaChainClient {
  public chains: { [key: string]: any };
  public network: string;
  public wallet: Wallet;
  public provider: any;

  constructor(params: ZetaChainClientParams = {}) {
    if (params.wallet && params.provider) {
      throw new Error("You can only provide a wallet or a provider, not both.");
    }

    this.chains = { ...networks };
    this.network = params.network || "";
    this.wallet = params.wallet;
    this.provider = params.provider;

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
  deposit = deposit;
}
