import { ethers } from "ethers";
export type ZRC20Contract = ethers.Contract & {
  PROTOCOL_FLAT_FEE: () => Promise<ethers.BigNumber>;
  withdrawGasFee: () => Promise<[ethers.BigNumber, ethers.BigNumber]>;
};
