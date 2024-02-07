import { networks } from "@zetachain/networks";
import merge from "lodash/merge";

import { getBalances } from "./balances";
import { getFees } from "./fees";

export class ZetaChainClient {
  private chains: any;

  constructor(params: any = { chains: {} }) {
    const mergeChains = (customChains: any): void => {
      for (const key in customChains) {
        if (customChains.hasOwnProperty(key)) {
          this.chains[key] = merge({}, this.chains[key], customChains[key]);
        }
      }
    };
    this.chains = { ...networks };

    mergeChains(params.chains);
  }

  public getChains(): any {
    return this.chains;
  }

  public async getBalances(network: any, evmAddress: any, btcAddress = null) {
    return await getBalances(this.chains, network, evmAddress, btcAddress);
  }

  public async getFees(network: any, gas: Number = 500000) {
    return await getFees(this.chains, network, gas);
  }
}
