import { ethers } from "ethers";

export type UniswapV2Router02Contract = ethers.Contract & {
  getAmountsIn: (
    amountOut: ethers.BigNumberish,
    path: string[]
  ) => Promise<ethers.BigNumber[]>;
  getAmountsOut: (
    amountIn: ethers.BigNumberish,
    path: string[]
  ) => Promise<ethers.BigNumber[]>;
};

export type ZRC20Contract = ethers.Contract & {
  COIN_TYPE: () => Promise<number>;
  PROTOCOL_FLAT_FEE: () => Promise<ethers.BigNumber>;
  decimals: () => Promise<number>;
  withdrawGasFee: () => Promise<[string, ethers.BigNumber]>;
};
