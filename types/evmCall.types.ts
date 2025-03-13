import { ethers } from "ethers";

interface RevertOptions {
  abortAddress: string;
  callOnRevert: boolean;
  onRevertGasLimit?: number;
  revertAddress?: string;
  revertMessage: string;
}

interface TxOptions {
  gasLimit?: number;
  gasPrice?: ethers.BigNumberish;
}

export type GatewayCallContract = ethers.Contract & {
  call: (
    receiver: string,
    encodedParameters: ethers.BytesLike,
    revertOptions: RevertOptions,
    txOptions?: TxOptions
  ) => Promise<ethers.ContractTransaction>;
};
