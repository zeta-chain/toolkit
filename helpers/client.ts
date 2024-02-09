import { networks } from "@zetachain/networks";
import merge from "lodash/merge";

import { getBalances } from "./balances";
import { getFees } from "./fees";
import { getPools } from "./pools";
import { sendZETA } from "./sendZETA";

export class ZetaChainClient {
  private chains: any;
  private network: any;

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

  public async getBalances(evmAddress: any, btcAddress = null) {
    return await getBalances(this.chains, this.network, evmAddress, btcAddress);
  }

  public async getFees(gas: Number = 500000) {
    return await getFees(this.chains, this.network, gas);
  }

  public async getPools() {
    return await getPools(this.chains, this.network);
  }

  public async sendZETA(
    signer: any,
    amount: string,
    from: string,
    destination: string,
    recipient: string
  ) {
    return await sendZETA(
      this.chains,
      this.network,
      signer,
      amount,
      from,
      destination,
      recipient
    );
  }
}
