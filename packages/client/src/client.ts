import type { Wallet as SolanaWallet } from "@coral-xyz/anchor";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { networks } from "@zetachain/networks";
import mainnetAddresses from "@zetachain/protocol-contracts/dist/data/addresses.mainnet.json";
import testnetAddresses from "@zetachain/protocol-contracts/dist/data/addresses.testnet.json";
import type { Signer, Wallet } from "ethers";
import has from "lodash/has";
import merge from "lodash/merge";

import { Chains } from "../../../types/client.types";
import { compareBigIntAndNumber } from "../../../utils/compareBigIntAndNumber";
import { handleError } from "../../../utils/handleError";
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

interface ZetaChainClientParamsBase {
  chains?: Chains;
  contracts?: LocalnetAddress[] | MainnetTestnetAddress[];
  network?: string;
}

type ZetaChainClientParams = ZetaChainClientParamsBase &
  (
    | {
        signer: Signer | SignerWithAddress;
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
  asset?: string;
  category: string;
  chain_id: string;
  chain_name: string;
  coin_type?: string;
  decimals?: number;
  description?: string;
  foreign_chain_id?: string;
  symbol?: string;
  type: string;
}

interface LocalnetAddress {
  address: string;
  chain: string;
  type: string;
}

export class ZetaChainClient {
  public chains: Chains;
  public network: string;
  public wallet: Wallet | undefined;
  public signer: Signer | SignerWithAddress | undefined;
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
    } else {
      this.contracts = (
        this.network.includes("test") ? testnetAddresses : mainnetAddresses
      ) as LocalnetAddress[] | MainnetTestnetAddress[];
    }

    this.mergeChains(params.chains);
  }

  private mergeChains(customChains: Chains = {}): void {
    Object.entries(customChains).forEach(([key, value]) => {
      if (has(customChains, key)) {
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
      if (this.wallet?.provider) {
        try {
          const walletNetwork = await this.wallet.provider.getNetwork();
          const chainId = walletNetwork?.chainId;
          gateway = (this.contracts as MainnetTestnetAddress[]).find((item) => {
            const isSameChainId = compareBigIntAndNumber(
              chainId,
              parseInt(item.chain_id)
            );

            return isSameChainId && item.type === "gateway";
          });
        } catch (error: unknown) {
          handleError({
            context: "Failed to get gateway address",
            error,
            shouldThrow: true,
          });
        }
      } else {
        try {
          if (this.signer && !("provider" in this.signer)) {
            throw new Error("Signer does not have a valid provider");
          }

          const signerNetwork = await this.signer?.provider?.getNetwork();

          if (!signerNetwork) {
            throw new Error("Invalid Signer network");
          }

          const chainId = signerNetwork.chainId;
          gateway = (this.contracts as MainnetTestnetAddress[]).find((item) => {
            const isSameChainId = compareBigIntAndNumber(
              chainId,
              parseInt(item.chain_id)
            );
            return isSameChainId && item.type === "gateway";
          });
        } catch (error: unknown) {
          handleError({
            context: "Failed to get gateway address",
            error,
            shouldThrow: true,
          });
        }
      }

      if (!gateway) {
        throw new Error(`Gateway address not found in signer or wallet`);
      }

      return gateway.address;
    }
  }

  public getChains(): Chains {
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
