/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type {
  IZetaConnectorEvents,
  IZetaConnectorEventsInterface,
} from "../../../../../../../@zetachain/protocol-contracts/contracts/evm/interfaces/IZetaConnector.sol/IZetaConnectorEvents";

const _abi = [
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
    name: "UpdatedZetaConnectorTSSAddress",
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
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Withdrawn",
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
    name: "WithdrawnAndCalled",
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
    name: "WithdrawnAndReverted",
    type: "event",
  },
] as const;

export class IZetaConnectorEvents__factory {
  static readonly abi = _abi;
  static createInterface(): IZetaConnectorEventsInterface {
    return new Interface(_abi) as IZetaConnectorEventsInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): IZetaConnectorEvents {
    return new Contract(
      address,
      _abi,
      runner
    ) as unknown as IZetaConnectorEvents;
  }
}
