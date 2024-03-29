/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../common";
import type {
  ZetaConnectorMockValue,
  ZetaConnectorMockValueInterface,
} from "../../../contracts/ZetaConnectorMock.sol/ZetaConnectorMockValue";

const _abi = [
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "destinationChainId",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "destinationAddress",
            type: "bytes",
          },
          {
            internalType: "uint256",
            name: "destinationGasLimit",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "message",
            type: "bytes",
          },
          {
            internalType: "uint256",
            name: "zetaValueAndGas",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "zetaParams",
            type: "bytes",
          },
        ],
        internalType: "struct ZetaInterfaces.SendInput",
        name: "input",
        type: "tuple",
      },
    ],
    name: "send",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const _bytecode =
  "0x608060405234801561001057600080fd5b5060ea8061001f6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063ec02690114602d575b600080fd5b60436004803603810190603f91906064565b6045565b005b50565b600060c08284031215605b57605a60a5565b5b81905092915050565b600060208284031215607757607660af565b5b600082013567ffffffffffffffff811115609257609160aa565b5b609c848285016048565b91505092915050565b600080fd5b600080fd5b600080fdfea2646970667358221220a533791b73f798c1ed73790b673d2b747d6d63cb50bff753a5a44bf51784d42764736f6c63430008070033";

type ZetaConnectorMockValueConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: ZetaConnectorMockValueConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class ZetaConnectorMockValue__factory extends ContractFactory {
  constructor(...args: ZetaConnectorMockValueConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ZetaConnectorMockValue> {
    return super.deploy(overrides || {}) as Promise<ZetaConnectorMockValue>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): ZetaConnectorMockValue {
    return super.attach(address) as ZetaConnectorMockValue;
  }
  override connect(signer: Signer): ZetaConnectorMockValue__factory {
    return super.connect(signer) as ZetaConnectorMockValue__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ZetaConnectorMockValueInterface {
    return new utils.Interface(_abi) as ZetaConnectorMockValueInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ZetaConnectorMockValue {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as ZetaConnectorMockValue;
  }
}
