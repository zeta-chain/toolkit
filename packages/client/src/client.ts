import { networks } from "@zetachain/networks";
import type { Signer, Wallet } from "ethers";
import merge from "lodash/merge";

import {
  deposit,
  getBalances,
  getChainId,
  getEndpoint,
  getFees,
  getForeignCoins,
  getPools,
  getQuote,
  getRefundFee,
  getSupportedChains,
  getWithdrawFeeInInputToken,
  getZRC20FromERC20,
  getZRC20GasToken,
  sendZeta,
  trackCCTX,
  withdraw,
} from ".";

export interface ZetaChainClientParamsBase {
  chains?: { [key: string]: any };
  network?: string;
}

export type ZetaChainClientParams = ZetaChainClientParamsBase &
  (
    | { signer: Signer; wallet?: never }
    | { signer?: never; wallet: Wallet }
    | { signer?: undefined; wallet?: undefined }
  );

export class ZetaChainClient {
  public chains: { [key: string]: any };
  public network: string;
  public wallet: Wallet | undefined;
  public signer: any | undefined;

  /**
   * Initializes ZetaChainClient instance.
   *
   * ```ts
   * new ZetaChainClient({
   *   network: "testnet"
   * })
   * ```
   *
   * With an Ethers.js wallet:
   *
   * ```ts
   * const client = new ZetaChainClient({
   *   network: "testnet",
   *   wallet: ethers.Wallet.fromMnemonic(process.env.MNEMONIC as string),
   * });
   * ```
   *
   * With a signer:
   *
   * ```ts
   * const client = new ZetaChainClient({
   *   network: "testnet",
   *   signer: await ethers.getSigners(),
   * });
   * ```
   *
   * Use a custom RPC endpoint for ZetaChain or any connected chain:
   *
   * ```ts
   * const client = new ZetaChainClient({
   *   network: "testnet",
   *   chains: {
   *     zeta_testnet: {
   *       api: {
   *         url: "https://zetachain-testnet-archive.allthatnode.com:8545/${process.env.KEY}",
   *         type: "evm",
   *       },
   *     },
   *   },
   * });
   * ```
   *
   * @param params
   */
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

  getEndpoint = getEndpoint;
  getBalances = getBalances;
  getForeignCoins = getForeignCoins;
  getSupportedChains = getSupportedChains;
  getFees = getFees;
  getPools = getPools;
  trackCCTX = trackCCTX;
  deposit = deposit;
  withdraw = withdraw;
  sendZeta = sendZeta;
  getChainId = getChainId;
  getQuote = getQuote;
  getWithdrawFeeInInputToken = getWithdrawFeeInInputToken;
  getRefundFee = getRefundFee;
  getZRC20FromERC20 = getZRC20FromERC20;
  getZRC20GasToken = getZRC20GasToken;
}
