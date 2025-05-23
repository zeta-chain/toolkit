/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type {
  SystemContractErrors,
  SystemContractErrorsInterface,
} from "../../../../../../@zetachain/protocol-contracts/contracts/zevm/SystemContract.sol/SystemContractErrors";

const _abi = [
  {
    inputs: [],
    name: "CallerIsNotFungibleModule",
    type: "error",
  },
  {
    inputs: [],
    name: "CantBeIdenticalAddresses",
    type: "error",
  },
  {
    inputs: [],
    name: "CantBeZeroAddress",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidTarget",
    type: "error",
  },
  {
    inputs: [],
    name: "ZeroAddress",
    type: "error",
  },
] as const;

export class SystemContractErrors__factory {
  static readonly abi = _abi;
  static createInterface(): SystemContractErrorsInterface {
    return new Interface(_abi) as SystemContractErrorsInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): SystemContractErrors {
    return new Contract(
      address,
      _abi,
      runner
    ) as unknown as SystemContractErrors;
  }
}
