import { ethers } from "ethers";

export type revertOptions = {
  onRevertGasLimit: number;
  revertAddress: string;
  revertMessage: string;
  callOnRevert: boolean;
};

export type txOptions = {
  gasLimit: number;
  gasPrice: ethers.BigNumber;
};
