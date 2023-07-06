/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  ZetaCommonErrors,
  ZetaCommonErrorsInterface,
} from "../../../../../../../@zetachain/protocol-contracts/contracts/evm/interfaces/ZetaInterfaces.sol/ZetaCommonErrors";

const _abi = [
  {
    inputs: [],
    name: "InvalidAddress",
    type: "error",
  },
] as const;

export class ZetaCommonErrors__factory {
  static readonly abi = _abi;
  static createInterface(): ZetaCommonErrorsInterface {
    return new utils.Interface(_abi) as ZetaCommonErrorsInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ZetaCommonErrors {
    return new Contract(address, _abi, signerOrProvider) as ZetaCommonErrors;
  }
}
