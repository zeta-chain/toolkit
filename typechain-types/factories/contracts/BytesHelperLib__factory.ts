/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Contract,
  ContractFactory,
  ContractTransactionResponse,
  Interface,
} from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../common";
import type {
  BytesHelperLib,
  BytesHelperLibInterface,
} from "../../contracts/BytesHelperLib";

const _abi = [
  {
    inputs: [],
    name: "OffsetOutOfBounds",
    type: "error",
  },
] as const;

const _bytecode =
  "0x60566050600b82828239805160001a6073146043577f4e487b7100000000000000000000000000000000000000000000000000000000600052600060045260246000fd5b30600052607381538281f3fe73000000000000000000000000000000000000000030146080604052600080fdfea2646970667358221220b5d80394ed91f3654a55cc76d4567a904dd67e151b2a45154198ba777be5e56564736f6c634300081a0033";

type BytesHelperLibConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: BytesHelperLibConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class BytesHelperLib__factory extends ContractFactory {
  constructor(...args: BytesHelperLibConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override getDeployTransaction(
    overrides?: NonPayableOverrides & { from?: string }
  ): Promise<ContractDeployTransaction> {
    return super.getDeployTransaction(overrides || {});
  }
  override deploy(overrides?: NonPayableOverrides & { from?: string }) {
    return super.deploy(overrides || {}) as Promise<
      BytesHelperLib & {
        deploymentTransaction(): ContractTransactionResponse;
      }
    >;
  }
  override connect(runner: ContractRunner | null): BytesHelperLib__factory {
    return super.connect(runner) as BytesHelperLib__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): BytesHelperLibInterface {
    return new Interface(_abi) as BytesHelperLibInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): BytesHelperLib {
    return new Contract(address, _abi, runner) as unknown as BytesHelperLib;
  }
}
