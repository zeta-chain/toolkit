import { ContractTransactionResponse, ethers } from "ethers";

export interface RevertOptions {
  abortAddress?: string;
  callOnRevert: boolean;
  onRevertGasLimit?: ethers.BigNumberish;
  revertAddress?: string;
  revertMessage: string;
}

export interface TxOptions {
  gasLimit?: ethers.BigNumberish;
  gasPrice?: ethers.BigNumberish;
  value?: ethers.BigNumberish;
}

export type CallOptions = {
  gasLimit: ethers.BigNumberish;
  isArbitraryCall: boolean;
};

export type UniswapV2Router02Contract = ethers.Contract & {
  getAmountsIn: (
    amountOut: ethers.BigNumberish,
    path: string[]
  ) => Promise<ethers.BigNumberish[]>;
  getAmountsOut: (
    amountIn: ethers.BigNumberish,
    path: string[]
  ) => Promise<ethers.BigNumberish[]>;
};

export type ZRC20Contract = ethers.Contract & {
  COIN_TYPE: () => Promise<number>;
  PROTOCOL_FLAT_FEE: () => Promise<ethers.BigNumberish>;
  approve: (
    spender: string,
    value: ethers.BigNumberish,
    txOptions: TxOptions
  ) => Promise<ContractTransactionResponse>;
  decimals: () => Promise<number>;
  withdrawGasFee: () => Promise<[string, ethers.BigNumberish]>;
  withdrawGasFeeWithGasLimit: (
    gasLimit: ethers.BigNumberish
  ) => Promise<[string, ethers.BigNumberish]>;
};

export type GatewayContract = ethers.Contract & {
  call: ((
    receiver: string,
    encodedParameters: ethers.BytesLike,
    revertOptions: RevertOptions,
    txOptions?: TxOptions
  ) => Promise<ethers.ContractTransaction>) &
    ((
      receiver: string,
      gasZrc20: string,
      message: string,
      callOptions: CallOptions,
      revertOptions: RevertOptions,
      txOptions?: TxOptions
    ) => Promise<ethers.ContractTransaction>);
  /**
   * Deposits ERC-20 tokens or native tokens to a receiver on ZetaChain.
   *
   * This method supports two overloads:
   * 1. For ERC-20 tokens: `deposit(receiver, value, erc20, revertOptions, txOptions)`
   * 2. For native tokens: `deposit(receiver, revertOptions, txOptions)`
   */
  deposit: ((
    receiver: string,
    value: ethers.BigNumberish,
    erc20: string,
    revertOptions: RevertOptions,
    txOptions?: TxOptions
  ) => Promise<ethers.ContractTransaction>) &
    ((
      receiver: string,
      revertOptions: RevertOptions,
      txOptions?: TxOptions
    ) => Promise<ethers.ContractTransaction>);
  depositAndCall: ((
    receiver: string,
    value: ethers.BigNumberish,
    erc20: string,
    encodedParameters: ethers.BytesLike,
    revertOptions: RevertOptions,
    txOptions?: TxOptions
  ) => Promise<ethers.ContractTransaction>) &
    ((
      receiver: string,
      encodedParameters: ethers.BytesLike,
      revertOptions: RevertOptions,
      txOptions?: TxOptions
    ) => Promise<ethers.ContractTransaction>);
  withdraw: (
    receiver: string,
    value: ethers.BigNumberish,
    erc20: string,
    revertOptions: RevertOptions,
    txOptions?: TxOptions
  ) => Promise<ethers.ContractTransaction>;
  withdrawAndCall: (
    receiver: string,
    value: ethers.BigNumberish,
    erc20: string,
    message: string,
    callOptions: CallOptions,
    revertOptions: RevertOptions,
    txOptions?: TxOptions
  ) => Promise<ethers.ContractTransaction>;
};

export type ERC20Contract = ethers.Contract & {
  /**
   * Approves the spender to spend a specified amount of tokens on behalf of the caller.
   *
   * @param spender - The address of the spender.
   * @param value - The amount of tokens to approve.
   * @returns A promise that resolves to a boolean indicating whether the approval was successful.
   */
  approve: (
    spender: string,
    value: ethers.BigNumberish
  ) => Promise<ethers.ContractTransaction>;

  /**
   * Returns the number of decimals used by the token.
   *
   * @returns A promise that resolves to the number of decimals.
   */
  decimals: () => Promise<number>;
};
