import { ethers } from "ethers";

export type revertOptions = {
  callOnRevert: boolean;
  onRevertGasLimit: number;
  revertAddress: string;
  revertMessage: string;
};

export type txOptions = {
  gasLimit: number;
  gasPrice: ethers.BigNumber;
};
