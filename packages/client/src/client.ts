import type { Wallet as SolanaWallet } from "@coral-xyz/anchor";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { networks } from "@zetachain/networks";
import mainnetAddresses from "@zetachain/protocol-contracts/dist/data/addresses.mainnet.json";
import testnetAddresses from "@zetachain/protocol-contracts/dist/data/addresses.testnet.json";
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
  contracts?: LocalnetAddress[] | MainnetTestnetAddress[];
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

interface MainnetTestnetAddress {
  address: string;
  category: string;
  chain_id: number;
  chain_name: string;
  type: string;
}

interface LocalnetAddress {
  address: string;
  chain: string;
  type: string;
}

export class ZetaChainClient {
  public chains: { [key: string]: any };
  public network: string;
  public wallet: Wallet | undefined;
  public signer: any | undefined;
  public solanaWallet: SolanaWallet | undefined;
  public solanaAdapter: WalletContextState | undefined;
  private contracts: LocalnetAddress[] | MainnetTestnetAddress[];

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

    if (params.contracts) {
      this.contracts = params.contracts;
    } else if (this.network === "localnet" || this.network === "localhost") {
      throw new Error("Localnet contracts are required");
    } else {
      this.contracts = this.network.includes("test")
        ? testnetAddresses
        : mainnetAddresses;
    }

    this.mergeChains(params.chains);
  }

  private mergeChains(customChains: { [key: string]: any } = {}): void {
    Object.entries(customChains).forEach(([key, value]) => {
      if (customChains.hasOwnProperty(key)) {
        this.chains[key] = merge({}, this.chains[key], value);
      }
    });
  }

  public async getGatewayAddress(): Promise<string> {
    if (this.network === "localnet" || this.network === "localhost") {
      const gateway = (this.contracts as LocalnetAddress[]).find(
        (item) => item.type === "gatewayZEVM"
      );

      if (!gateway) {
        throw new Error("Gateway address not found in localnet configuration");
      }

      return gateway.address;
    } else {
      let gateway;
      if (this.wallet) {
        try {
          const chainId = await this.wallet!.getChainId();
          gateway = (this.contracts as MainnetTestnetAddress[]).find(
            (item) => chainId === item.chain_id && item.type === "gateway"
          );
        } catch (error) {
          throw new Error("Failed to get gateway address: " + error);
        }
      } else {
        try {
          const chainId = await this.signer!.getChainId();
          gateway = (this.contracts as MainnetTestnetAddress[]).find(
            (item) => chainId === item.chain_id && item.type === "gateway"
          );
        } catch (error) {
          throw new Error("Failed to get gateway address: " + error);
        }
      }

      if (!gateway) {
        throw new Error(`Gateway address not found in signer or wallet`);
      }

      return gateway.address;
    }
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
