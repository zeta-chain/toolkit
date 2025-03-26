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
  SwapHelperLib,
  SwapHelperLibInterface,
} from "../../contracts/SwapHelperLib";

const _abi = [
  {
    inputs: [],
    name: "AdditionsOverflow",
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
    name: "IdenticalAddresses",
    type: "error",
  },
  {
    inputs: [],
    name: "InsufficientInputAmount",
    type: "error",
  },
  {
    inputs: [],
    name: "InsufficientLiquidity",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidPath",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidPathLength",
    type: "error",
  },
  {
    inputs: [],
    name: "MultiplicationsOverflow",
    type: "error",
  },
  {
    inputs: [],
    name: "NotEnoughToPayGasFee",
    type: "error",
  },
  {
    inputs: [],
    name: "WrongGasContract",
    type: "error",
  },
  {
    inputs: [],
    name: "ZeroAddress",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "router",
        type: "address",
      },
      {
        internalType: "address",
        name: "zrc20",
        type: "address",
      },
      {
        internalType: "address",
        name: "target",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
    ],
    name: "getMinOutAmount",
    outputs: [
      {
        internalType: "uint256",
        name: "minOutAmount",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "factory",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenA",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenB",
        type: "address",
      },
    ],
    name: "uniswapv2PairFor",
    outputs: [
      {
        internalType: "address",
        name: "pair",
        type: "address",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
] as const;

const _bytecode =
  "0x6111d5610052600b82828239805160001a6073146045577f4e487b7100000000000000000000000000000000000000000000000000000000600052600060045260246000fd5b30600052607381538281f3fe73000000000000000000000000000000000000000030146080604052600436106100405760003560e01c806354ce67ae14610045578063c63585cc14610075575b600080fd5b61005f600480360381019061005a9190610c69565b6100a5565b60405161006c9190610cdf565b60405180910390f35b61008f600480360381019061008a9190610cfa565b610489565b60405161009c9190610d5c565b60405180910390f35b6000808573ffffffffffffffffffffffffffffffffffffffff1663c45a01556040518163ffffffff1660e01b8152600401602060405180830381865afa1580156100f3573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906101179190610d8c565b905060008673ffffffffffffffffffffffffffffffffffffffff1663ad5c46486040518163ffffffff1660e01b8152600401602060405180830381865afa158015610166573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061018a9190610d8c565b90506060600267ffffffffffffffff8111156101a9576101a8610db9565b5b6040519080825280602002602001820160405280156101d75781602001602082028036833780820191505090505b50905086816000815181106101ef576101ee610de8565b5b602002602001019073ffffffffffffffffffffffffffffffffffffffff16908173ffffffffffffffffffffffffffffffffffffffff1681525050858160018151811061023e5761023d610de8565b5b602002602001019073ffffffffffffffffffffffffffffffffffffffff16908173ffffffffffffffffffffffffffffffffffffffff168152505060006102858487846104fb565b9050600367ffffffffffffffff8111156102a2576102a1610db9565b5b6040519080825280602002602001820160405280156102d05781602001602082028036833780820191505090505b50915087826000815181106102e8576102e7610de8565b5b602002602001019073ffffffffffffffffffffffffffffffffffffffff16908173ffffffffffffffffffffffffffffffffffffffff1681525050828260018151811061033757610336610de8565b5b602002602001019073ffffffffffffffffffffffffffffffffffffffff16908173ffffffffffffffffffffffffffffffffffffffff1681525050868260028151811061038657610385610de8565b5b602002602001019073ffffffffffffffffffffffffffffffffffffffff16908173ffffffffffffffffffffffffffffffffffffffff168152505060006103cd8588856104fb565b905080600182516103de9190610e46565b815181106103ef576103ee610de8565b5b602002602001015182600184516104069190610e46565b8151811061041757610416610de8565b5b6020026020010151116104515780600182516104339190610e46565b8151811061044457610443610de8565b5b602002602001015161047a565b81600183516104609190610e46565b8151811061047157610470610de8565b5b60200260200101515b95505050505050949350505050565b60008060006104988585610677565b915091508582826040516020016104b0929190610ec2565b604051602081830303815290604052805190602001206040516020016104d7929190610fbc565b6040516020818303038152906040528051906020012060001c925050509392505050565b6060600282511015610539576040517f20db826700000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b815167ffffffffffffffff81111561055457610553610db9565b5b6040519080825280602002602001820160405280156105825781602001602082028036833780820191505090505b509050828160008151811061059a57610599610de8565b5b60200260200101818152505060005b600183516105b79190610e46565b81101561066f5760008061060c878685815181106105d8576105d7610de8565b5b6020026020010151876001876105ee9190610ffe565b815181106105ff576105fe610de8565b5b6020026020010151610791565b9150915061063584848151811061062657610625610de8565b5b60200260200101518383610894565b846001856106439190610ffe565b8151811061065457610653610de8565b5b602002602001018181525050505080806001019150506105a9565b509392505050565b6000808273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff16036106df576040517fcb1e7cfe00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b8273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff161061071957828461071c565b83835b8092508193505050600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff160361078a576040517f78b507da00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b9250929050565b60008060006107a08585610988565b5090506000806107b1888888610aa2565b73ffffffffffffffffffffffffffffffffffffffff16630902f1ac6040518163ffffffff1660e01b8152600401606060405180830381865afa1580156107fb573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061081f91906110b4565b506dffffffffffffffffffffffffffff1691506dffffffffffffffffffffffffffff1691508273ffffffffffffffffffffffffffffffffffffffff168773ffffffffffffffffffffffffffffffffffffffff161461087e578082610881565b81815b8095508196505050505050935093915050565b60008084036108cf576040517f098fb56100000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60008314806108de5750600082145b15610915576040517fbb55fd2700000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b600061092c6103e586610b2990919063ffffffff16565b905060006109438483610b2990919063ffffffff16565b9050600061096e836109606103e889610b2990919063ffffffff16565b610b8990919063ffffffff16565b9050808261097c9190611136565b93505050509392505050565b6000808273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff16036109f0576040517fbd969eb000000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b8273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff1610610a2a578284610a2d565b83835b8092508193505050600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603610a9b576040517fd92e233d00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b9250929050565b60008373ffffffffffffffffffffffffffffffffffffffff1663e6a4390584846040518363ffffffff1660e01b8152600401610adf929190611176565b602060405180830381865afa158015610afc573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610b209190610d8c565b90509392505050565b600080831480610b4d5750818383850292508281610b4a57610b49611107565b5b04145b610b83576040517f5797276a00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b92915050565b6000818301905082811015610bca576040517fa259879500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b92915050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610c0082610bd5565b9050919050565b610c1081610bf5565b8114610c1b57600080fd5b50565b600081359050610c2d81610c07565b92915050565b6000819050919050565b610c4681610c33565b8114610c5157600080fd5b50565b600081359050610c6381610c3d565b92915050565b60008060008060808587031215610c8357610c82610bd0565b5b6000610c9187828801610c1e565b9450506020610ca287828801610c1e565b9350506040610cb387828801610c1e565b9250506060610cc487828801610c54565b91505092959194509250565b610cd981610c33565b82525050565b6000602082019050610cf46000830184610cd0565b92915050565b600080600060608486031215610d1357610d12610bd0565b5b6000610d2186828701610c1e565b9350506020610d3286828701610c1e565b9250506040610d4386828701610c1e565b9150509250925092565b610d5681610bf5565b82525050565b6000602082019050610d716000830184610d4d565b92915050565b600081519050610d8681610c07565b92915050565b600060208284031215610da257610da1610bd0565b5b6000610db084828501610d77565b91505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000610e5182610c33565b9150610e5c83610c33565b9250828203905081811115610e7457610e73610e17565b5b92915050565b60008160601b9050919050565b6000610e9282610e7a565b9050919050565b6000610ea482610e87565b9050919050565b610ebc610eb782610bf5565b610e99565b82525050565b6000610ece8285610eab565b601482019150610ede8284610eab565b6014820191508190509392505050565b600081905092915050565b7fff00000000000000000000000000000000000000000000000000000000000000600082015250565b6000610f2f600183610eee565b9150610f3a82610ef9565b600182019050919050565b6000819050919050565b6000819050919050565b610f6a610f6582610f45565b610f4f565b82525050565b7f96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f600082015250565b6000610fa6602083610eee565b9150610fb182610f70565b602082019050919050565b6000610fc782610f22565b9150610fd38285610eab565b601482019150610fe38284610f59565b602082019150610ff282610f99565b91508190509392505050565b600061100982610c33565b915061101483610c33565b925082820190508082111561102c5761102b610e17565b5b92915050565b60006dffffffffffffffffffffffffffff82169050919050565b61105581611032565b811461106057600080fd5b50565b6000815190506110728161104c565b92915050565b600063ffffffff82169050919050565b61109181611078565b811461109c57600080fd5b50565b6000815190506110ae81611088565b92915050565b6000806000606084860312156110cd576110cc610bd0565b5b60006110db86828701611063565b93505060206110ec86828701611063565b92505060406110fd8682870161109f565b9150509250925092565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601260045260246000fd5b600061114182610c33565b915061114c83610c33565b92508261115c5761115b611107565b5b828204905092915050565b61117081610bf5565b82525050565b600060408201905061118b6000830185611167565b6111986020830184611167565b939250505056fea2646970667358221220f8a7cdfbaca1847a7b2c275e0e78c76b49768d9d7d65b0a93b0510b44467fa2864736f6c634300081a0033";

type SwapHelperLibConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: SwapHelperLibConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class SwapHelperLib__factory extends ContractFactory {
  constructor(...args: SwapHelperLibConstructorParams) {
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
      SwapHelperLib & {
        deploymentTransaction(): ContractTransactionResponse;
      }
    >;
  }
  override connect(runner: ContractRunner | null): SwapHelperLib__factory {
    return super.connect(runner) as SwapHelperLib__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): SwapHelperLibInterface {
    return new Interface(_abi) as SwapHelperLibInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): SwapHelperLib {
    return new Contract(address, _abi, runner) as unknown as SwapHelperLib;
  }
}
