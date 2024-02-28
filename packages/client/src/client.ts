import { networks } from "@zetachain/networks";
import type { Wallet } from "ethers";
import merge from "lodash/merge";

import {
  deposit,
  getBalances,
  getEndpoints,
  getFees,
  getForeignCoins,
  getPools,
  getSupportedChains,
  sendZeta,
  sendZRC20,
  trackCCTX,
  withdraw,
  getChainId,
} from ".";

interface ZetaChainClientParamsBase {
  chains?: { [key: string]: any };
  network?: string;
}

type ZetaChainClientParams = ZetaChainClientParamsBase &
  (
    | { signer: any; wallet?: never }
    | { signer?: never; wallet: any }
    | { signer?: undefined; wallet?: undefined }
  );

export class ZetaChainClient {
  public chains: { [key: string]: any };
  public network: string;
  public wallet: Wallet | undefined;
  public signer: any | undefined;

  constructor(params: ZetaChainClientParams) {
    if (params.wallet && params.signer) {
      throw new Error("You can only provide a wallet or a signer, not both.");
    } else if (params.wallet) {
      this.wallet = params.wallet;
    } else if (params.signer) {
      this.signer = params.signer;
    }
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
  sendZRC20 = sendZRC20;
  trackCCTX = trackCCTX;
  deposit = deposit;
  withdraw = withdraw;
  sendZeta = sendZeta;
  getChainId = getChainId;
}
