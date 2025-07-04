/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type {
  IGatewayEVMEvents,
  IGatewayEVMEventsInterface,
} from "../../../../../../../@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol/IGatewayEVMEvents";

const _abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "receiver",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "payload",
        type: "bytes",
      },
      {
        components: [
          {
            internalType: "address",
            name: "revertAddress",
            type: "address",
          },
          {
            internalType: "bool",
            name: "callOnRevert",
            type: "bool",
          },
          {
            internalType: "address",
            name: "abortAddress",
            type: "address",
          },
          {
            internalType: "bytes",
            name: "revertMessage",
            type: "bytes",
          },
          {
            internalType: "uint256",
            name: "onRevertGasLimit",
            type: "uint256",
          },
        ],
        indexed: false,
        internalType: "struct RevertOptions",
        name: "revertOptions",
        type: "tuple",
      },
    ],
    name: "Called",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "receiver",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "asset",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "payload",
        type: "bytes",
      },
      {
        components: [
          {
            internalType: "address",
            name: "revertAddress",
            type: "address",
          },
          {
            internalType: "bool",
            name: "callOnRevert",
            type: "bool",
          },
          {
            internalType: "address",
            name: "abortAddress",
            type: "address",
          },
          {
            internalType: "bytes",
            name: "revertMessage",
            type: "bytes",
          },
          {
            internalType: "uint256",
            name: "onRevertGasLimit",
            type: "uint256",
          },
        ],
        indexed: false,
        internalType: "struct RevertOptions",
        name: "revertOptions",
        type: "tuple",
      },
    ],
    name: "Deposited",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "receiver",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "asset",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "payload",
        type: "bytes",
      },
      {
        components: [
          {
            internalType: "address",
            name: "revertAddress",
            type: "address",
          },
          {
            internalType: "bool",
            name: "callOnRevert",
            type: "bool",
          },
          {
            internalType: "address",
            name: "abortAddress",
            type: "address",
          },
          {
            internalType: "bytes",
            name: "revertMessage",
            type: "bytes",
          },
          {
            internalType: "uint256",
            name: "onRevertGasLimit",
            type: "uint256",
          },
        ],
        indexed: false,
        internalType: "struct RevertOptions",
        name: "revertOptions",
        type: "tuple",
      },
    ],
    name: "DepositedAndCalled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "destination",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "Executed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "ExecutedWithERC20",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
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
        indexed: false,
        internalType: "struct RevertContext",
        name: "revertContext",
        type: "tuple",
      },
    ],
    name: "Reverted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "oldTSSAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "newTSSAddress",
        type: "address",
      },
    ],
    name: "UpdatedGatewayTSSAddress",
    type: "event",
  },
] as const;

export class IGatewayEVMEvents__factory {
  static readonly abi = _abi;
  static createInterface(): IGatewayEVMEventsInterface {
    return new Interface(_abi) as IGatewayEVMEventsInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): IGatewayEVMEvents {
    return new Contract(address, _abi, runner) as unknown as IGatewayEVMEvents;
  }
}
