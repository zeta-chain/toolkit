/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  Abortable,
  AbortableInterface,
} from "../../../../../@zetachain/protocol-contracts/contracts/Revert.sol/Abortable";

const _abi = [
  {
    inputs: [
      {
        components: [
          {
            internalType: "bytes",
            name: "sender",
            type: "bytes",
          },
          {
            internalType: "address",
            name: "asset",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "outgoing",
            type: "bool",
          },
          {
            internalType: "uint256",
            name: "chainID",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "revertMessage",
            type: "bytes",
          },
        ],
        internalType: "struct AbortContext",
        name: "abortContext",
        type: "tuple",
      },
    ],
    name: "onAbort",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export class Abortable__factory {
  static readonly abi = _abi;
  static createInterface(): AbortableInterface {
    return new utils.Interface(_abi) as AbortableInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): Abortable {
    return new Contract(address, _abi, signerOrProvider) as Abortable;
  }
}
