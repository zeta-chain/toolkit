/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type {
  IGatewayZEVM,
  IGatewayZEVMInterface,
} from "../../../../../../../@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol/IGatewayZEVM";

const _abi = [
  {
    inputs: [],
    name: "CallerIsNotProtocol",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "FailedZetaSent",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "GasFeeTransferFailed",
    type: "error",
  },
  {
    inputs: [],
    name: "InsufficientGasLimit",
    type: "error",
  },
  {
    inputs: [],
    name: "InsufficientZRC20Amount",
    type: "error",
  },
  {
    inputs: [],
    name: "InsufficientZetaAmount",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidTarget",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "provided",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "maximum",
        type: "uint256",
      },
    ],
    name: "MessageSizeExceeded",
    type: "error",
  },
  {
    inputs: [],
    name: "OnlyWZETAOrProtocol",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "WithdrawalFailed",
    type: "error",
  },
  {
    inputs: [
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
    ],
    name: "ZRC20BurnFailed",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "zrc20",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "ZRC20DepositFailed",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "zrc20",
        type: "address",
      },
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "ZRC20TransferFailed",
    type: "error",
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
        name: "zrc20",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "receiver",
        type: "bytes",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "message",
        type: "bytes",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "gasLimit",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "isArbitraryCall",
            type: "bool",
          },
        ],
        indexed: false,
        internalType: "struct CallOptions",
        name: "callOptions",
        type: "tuple",
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
        internalType: "uint256",
        name: "chainId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "receiver",
        type: "bytes",
      },
      {
        indexed: false,
        internalType: "address",
        name: "zrc20",
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
        internalType: "uint256",
        name: "gasfee",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "protocolFlatFee",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "message",
        type: "bytes",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "gasLimit",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "isArbitraryCall",
            type: "bool",
          },
        ],
        indexed: false,
        internalType: "struct CallOptions",
        name: "callOptions",
        type: "tuple",
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
    name: "Withdrawn",
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
        internalType: "uint256",
        name: "chainId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "receiver",
        type: "bytes",
      },
      {
        indexed: false,
        internalType: "address",
        name: "zrc20",
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
        internalType: "uint256",
        name: "gasfee",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "protocolFlatFee",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "message",
        type: "bytes",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "gasLimit",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "isArbitraryCall",
            type: "bool",
          },
        ],
        indexed: false,
        internalType: "struct CallOptions",
        name: "callOptions",
        type: "tuple",
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
    name: "WithdrawnAndCalled",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "receiver",
        type: "bytes",
      },
      {
        internalType: "address",
        name: "zrc20",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "message",
        type: "bytes",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "gasLimit",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "isArbitraryCall",
            type: "bool",
          },
        ],
        internalType: "struct CallOptions",
        name: "callOptions",
        type: "tuple",
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
        internalType: "struct RevertOptions",
        name: "revertOptions",
        type: "tuple",
      },
    ],
    name: "call",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
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
        internalType: "address",
        name: "target",
        type: "address",
      },
    ],
    name: "deposit",
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
            name: "sender",
            type: "bytes",
          },
          {
            internalType: "address",
            name: "senderEVM",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "chainID",
            type: "uint256",
          },
        ],
        internalType: "struct MessageContext",
        name: "context",
        type: "tuple",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "target",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "message",
        type: "bytes",
      },
    ],
    name: "depositAndCall",
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
            name: "sender",
            type: "bytes",
          },
          {
            internalType: "address",
            name: "senderEVM",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "chainID",
            type: "uint256",
          },
        ],
        internalType: "struct MessageContext",
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
        internalType: "address",
        name: "target",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "message",
        type: "bytes",
      },
    ],
    name: "depositAndCall",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
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
        internalType: "address",
        name: "target",
        type: "address",
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
        internalType: "struct RevertContext",
        name: "revertContext",
        type: "tuple",
      },
    ],
    name: "depositAndRevert",
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
            name: "sender",
            type: "bytes",
          },
          {
            internalType: "address",
            name: "senderEVM",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "chainID",
            type: "uint256",
          },
        ],
        internalType: "struct MessageContext",
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
        internalType: "address",
        name: "target",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "message",
        type: "bytes",
      },
    ],
    name: "execute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "target",
        type: "address",
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
        internalType: "struct RevertContext",
        name: "revertContext",
        type: "tuple",
      },
    ],
    name: "executeRevert",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "receiver",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "zrc20",
        type: "address",
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
        internalType: "struct RevertOptions",
        name: "revertOptions",
        type: "tuple",
      },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "receiver",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "chainId",
        type: "uint256",
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
        internalType: "struct RevertOptions",
        name: "revertOptions",
        type: "tuple",
      },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "receiver",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "chainId",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "message",
        type: "bytes",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "gasLimit",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "isArbitraryCall",
            type: "bool",
          },
        ],
        internalType: "struct CallOptions",
        name: "callOptions",
        type: "tuple",
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
        internalType: "struct RevertOptions",
        name: "revertOptions",
        type: "tuple",
      },
    ],
    name: "withdrawAndCall",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "receiver",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "zrc20",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "message",
        type: "bytes",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "gasLimit",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "isArbitraryCall",
            type: "bool",
          },
        ],
        internalType: "struct CallOptions",
        name: "callOptions",
        type: "tuple",
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
        internalType: "struct RevertOptions",
        name: "revertOptions",
        type: "tuple",
      },
    ],
    name: "withdrawAndCall",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export class IGatewayZEVM__factory {
  static readonly abi = _abi;
  static createInterface(): IGatewayZEVMInterface {
    return new Interface(_abi) as IGatewayZEVMInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): IGatewayZEVM {
    return new Contract(address, _abi, runner) as unknown as IGatewayZEVM;
  }
}
