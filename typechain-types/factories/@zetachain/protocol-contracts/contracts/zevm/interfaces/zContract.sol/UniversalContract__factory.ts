/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  UniversalContract,
  UniversalContractInterface,
} from "../../../../../../../@zetachain/protocol-contracts/contracts/zevm/interfaces/zContract.sol/UniversalContract";

const _abi = [
  {
    inputs: [
      {
        components: [
          {
            internalType: "bytes",
            name: "origin",
            type: "bytes",
          },
          {
            internalType: "address",
            name: "sender",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "chainID",
            type: "uint256",
          },
        ],
        internalType: "struct zContext",
        name: "context",
        type: "tuple",
      },
      {
        internalType: "address",
        name: "zrc20",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "message",
        type: "bytes",
      },
    ],
    name: "onCrossChainCall",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "bytes",
            name: "origin",
            type: "bytes",
          },
          {
            internalType: "address",
            name: "sender",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "chainID",
            type: "uint256",
          },
        ],
        internalType: "struct revertContext",
        name: "context",
        type: "tuple",
      },
      {
        internalType: "address",
        name: "zrc20",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "message",
        type: "bytes",
      },
    ],
    name: "onRevert",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export class UniversalContract__factory {
  static readonly abi = _abi;
  static createInterface(): UniversalContractInterface {
    return new utils.Interface(_abi) as UniversalContractInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): UniversalContract {
    return new Contract(address, _abi, signerOrProvider) as UniversalContract;
  }
}
