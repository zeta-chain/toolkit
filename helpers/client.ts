import { networks } from "@zetachain/networks";
import merge from "lodash/merge";

import { getBalances } from "./balances";

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
}
