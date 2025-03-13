/* eslint-disable prettier/prettier */
import { ethers } from "ethers";

// Define the type for the revert options
interface RevertOptions {
  abortAddress: string;
  callOnRevert: boolean;
  onRevertGasLimit?: number;
  revertAddress?: string;
  revertMessage: string;
}

// Define the type for the transaction options
interface TxOptions {
  gasLimit?: number;
  gasPrice?: ethers.BigNumberish;
  value?: ethers.BigNumberish; // For native token deposits
}

// Define the GatewayDepositContract type
export type GatewayDepositContract = ethers.Contract & {
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
