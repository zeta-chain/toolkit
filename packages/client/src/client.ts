import type { Wallet as SolanaWallet } from "@coral-xyz/anchor";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { networks } from "@zetachain/networks";
import type { Signer, Wallet } from "ethers";
import merge from "lodash/merge";

import {
  evmCall,
  evmDeposit,
  evmDepositAndCall,
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
  solanaDeposit,
  solanaDepositAndCall,
  trackCCTX,
  zetachainCall,
  zetachainWithdraw,
  zetachainWithdrawAndCall,
} from ".";

export interface ZetaChainClientParamsBase {
  chains?: { [key: string]: any };
  network?: string;
}

export type ZetaChainClientParams = ZetaChainClientParamsBase &
  (
    | {
        signer: Signer;
        solanaAdapter?: never;
        solanaWallet?: never;
        wallet?: never;
      }
    | {
        signer?: never;
        solanaAdapter: WalletContextState;
        solanaWallet?: never;
        wallet?: never;
      }
    | {
        signer?: never;
        solanaAdapter?: never;
        solanaWallet: SolanaWallet;
        wallet?: never;
      }
    | {
        signer?: never;
        solanaAdapter?: never;
        solanaWallet?: never;
        wallet: Wallet;
      }
    | {
        signer?: undefined;
        solanaAdapter?: undefined;
        solanaWallet?: undefined;
        wallet?: undefined;
      }
  );

export class ZetaChainClient {
  public chains: { [key: string]: any };
  public network: string;
  public wallet: Wallet | undefined;
  public signer: any | undefined;
  public solanaWallet: SolanaWallet | undefined;
  public solanaAdapter: WalletContextState | undefined;

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
    } else if (params.solanaWallet) {
      this.solanaWallet = params.solanaWallet;
    } else if (params.solanaAdapter) {
      this.solanaAdapter = params.solanaAdapter;
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

  public isSolanaWalletConnected(): boolean {
    return this.solanaAdapter?.connected || this.solanaWallet !== undefined;
  }

  public getSolanaPublicKey(): PublicKey | null {
    return (
      this.solanaAdapter?.publicKey || this.solanaWallet?.publicKey || null
    );
  }

  getEndpoint = getEndpoint;
  getBalances = getBalances;
  getForeignCoins = getForeignCoins;
  getSupportedChains = getSupportedChains;
  getFees = getFees;
  getPools = getPools;
  trackCCTX = trackCCTX;
  sendZeta = sendZeta;
  getChainId = getChainId;
  getQuote = getQuote;
  getWithdrawFeeInInputToken = getWithdrawFeeInInputToken;
  getRefundFee = getRefundFee;
  getZRC20FromERC20 = getZRC20FromERC20;
  getZRC20GasToken = getZRC20GasToken;
  solanaDeposit = solanaDeposit;
  solanaDepositAndCall = solanaDepositAndCall;
  zetachainWithdrawAndCall = zetachainWithdrawAndCall;
  zetachainWithdraw = zetachainWithdraw;
  zetachainCall = zetachainCall;
  evmDepositAndCall = evmDepositAndCall;
  evmCall = evmCall;
  evmDeposit = evmDeposit;
}
