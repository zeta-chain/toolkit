/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type {
  Revertable,
  RevertableInterface,
} from "../../../../../@zetachain/protocol-contracts/contracts/Revert.sol/Revertable";

const _abi = [
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "sender",
            type: "address",
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
            internalType: "bytes",
            name: "revertMessage",
            type: "bytes",
          },
        ],
        internalType: "struct RevertContext",
        name: "revertContext",
        type: "tuple",
      },
    ],
    name: "onRevert",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export class Revertable__factory {
  static readonly abi = _abi;
  static createInterface(): RevertableInterface {
    return new Interface(_abi) as RevertableInterface;
  }
  static connect(address: string, runner?: ContractRunner | null): Revertable {
    return new Contract(address, _abi, runner) as unknown as Revertable;
  }
}
