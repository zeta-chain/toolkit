/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Signer,
  utils,
  Contract,
  ContractFactory,
  BigNumberish,
  Overrides,
} from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../common";
import type { TestZRC20, TestZRC20Interface } from "../../contracts/TestZRC20";

const _abi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "initialSupply",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "string",
        name: "symbol",
        type: "string",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
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
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
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
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "offset",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "size",
        type: "uint256",
      },
    ],
    name: "bytesToAddress",
    outputs: [
      {
        internalType: "address",
        name: "output",
        type: "address",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "subtractedValue",
        type: "uint256",
      },
    ],
    name: "decreaseAllowance",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
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
    name: "deposit",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "addedValue",
        type: "uint256",
      },
    ],
    name: "increaseAllowance",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
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
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
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
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "to",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "withdraw",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawGasFee",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const _bytecode =
  "0x608060405234801561001057600080fd5b5060405161202a38038061202a833981810160405281019061003291906103b5565b818181600390816100439190610657565b5080600490816100539190610657565b50505061008d3361006861009560201b60201c565b60ff16600a610077919061088b565b8561008291906108d6565b61009e60201b60201c565b5050506109f3565b60006012905090565b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff160361010d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161010490610975565b60405180910390fd5b61011f6000838361020060201b60201c565b80600260008282546101319190610995565b92505081905550806000808473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825401925050819055508173ffffffffffffffffffffffffffffffffffffffff16600073ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516101e291906109d8565b60405180910390a36101fc6000838361020560201b60201c565b5050565b505050565b505050565b6000604051905090565b600080fd5b600080fd5b6000819050919050565b6102318161021e565b811461023c57600080fd5b50565b60008151905061024e81610228565b92915050565b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6102a78261025e565b810181811067ffffffffffffffff821117156102c6576102c561026f565b5b80604052505050565b60006102d961020a565b90506102e5828261029e565b919050565b600067ffffffffffffffff8211156103055761030461026f565b5b61030e8261025e565b9050602081019050919050565b60005b8381101561033957808201518184015260208101905061031e565b60008484015250505050565b6000610358610353846102ea565b6102cf565b90508281526020810184848401111561037457610373610259565b5b61037f84828561031b565b509392505050565b600082601f83011261039c5761039b610254565b5b81516103ac848260208601610345565b91505092915050565b6000806000606084860312156103ce576103cd610214565b5b60006103dc8682870161023f565b935050602084015167ffffffffffffffff8111156103fd576103fc610219565b5b61040986828701610387565b925050604084015167ffffffffffffffff81111561042a57610429610219565b5b61043686828701610387565b9150509250925092565b600081519050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061049257607f821691505b6020821081036104a5576104a461044b565b5b50919050565b60008190508160005260206000209050919050565b60006020601f8301049050919050565b600082821b905092915050565b60006008830261050d7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff826104d0565b61051786836104d0565b95508019841693508086168417925050509392505050565b6000819050919050565b600061055461054f61054a8461021e565b61052f565b61021e565b9050919050565b6000819050919050565b61056e83610539565b61058261057a8261055b565b8484546104dd565b825550505050565b600090565b61059761058a565b6105a2818484610565565b505050565b5b818110156105c6576105bb60008261058f565b6001810190506105a8565b5050565b601f82111561060b576105dc816104ab565b6105e5846104c0565b810160208510156105f4578190505b610608610600856104c0565b8301826105a7565b50505b505050565b600082821c905092915050565b600061062e60001984600802610610565b1980831691505092915050565b6000610647838361061d565b9150826002028217905092915050565b61066082610440565b67ffffffffffffffff8111156106795761067861026f565b5b610683825461047a565b61068e8282856105ca565b600060209050601f8311600181146106c157600084156106af578287015190505b6106b9858261063b565b865550610721565b601f1984166106cf866104ab565b60005b828110156106f7578489015182556001820191506020850194506020810190506106d2565b868310156107145784890151610710601f89168261061d565b8355505b6001600288020188555050505b505050505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b60008160011c9050919050565b6000808291508390505b60018511156107af5780860481111561078b5761078a610729565b5b600185161561079a5780820291505b80810290506107a885610758565b945061076f565b94509492505050565b6000826107c85760019050610884565b816107d65760009050610884565b81600181146107ec57600281146107f657610825565b6001915050610884565b60ff84111561080857610807610729565b5b8360020a91508482111561081f5761081e610729565b5b50610884565b5060208310610133831016604e8410600b841016171561085a5782820a90508381111561085557610854610729565b5b610884565b6108678484846001610765565b9250905081840481111561087e5761087d610729565b5b81810290505b9392505050565b60006108968261021e565b91506108a18361021e565b92506108ce7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff84846107b8565b905092915050565b60006108e18261021e565b91506108ec8361021e565b92508282026108fa8161021e565b9150828204841483151761091157610910610729565b5b5092915050565b600082825260208201905092915050565b7f45524332303a206d696e7420746f20746865207a65726f206164647265737300600082015250565b600061095f601f83610918565b915061096a82610929565b602082019050919050565b6000602082019050818103600083015261098e81610952565b9050919050565b60006109a08261021e565b91506109ab8361021e565b92508282019050808211156109c3576109c2610729565b5b92915050565b6109d28161021e565b82525050565b60006020820190506109ed60008301846109c9565b92915050565b61162880610a026000396000f3fe608060405234801561001057600080fd5b50600436106100f55760003560e01c806347e7ef2411610097578063a9059cbb11610066578063a9059cbb146102c2578063c7012626146102f2578063d9eeebed14610322578063dd62ed3e14610341576100f5565b806347e7ef241461021457806370a082311461024457806395d89b4114610274578063a457c2d714610292576100f5565b806323b872dd116100d357806323b872dd146101665780632c27d3ab14610196578063313ce567146101c657806339509351146101e4576100f5565b806306fdde03146100fa578063095ea7b31461011857806318160ddd14610148575b600080fd5b610102610371565b60405161010f9190610d2f565b60405180910390f35b610132600480360381019061012d9190610def565b610403565b60405161013f9190610e4a565b60405180910390f35b610150610426565b60405161015d9190610e74565b60405180910390f35b610180600480360381019061017b9190610e8f565b610430565b60405161018d9190610e4a565b60405180910390f35b6101b060048036038101906101ab9190610f47565b61045f565b6040516101bd9190610fca565b60405180910390f35b6101ce6104d3565b6040516101db9190611001565b60405180910390f35b6101fe60048036038101906101f99190610def565b6104dc565b60405161020b9190610e4a565b60405180910390f35b61022e60048036038101906102299190610def565b610513565b60405161023b9190610e4a565b60405180910390f35b61025e6004803603810190610259919061101c565b61051f565b60405161026b9190610e74565b60405180910390f35b61027c610567565b6040516102899190610d2f565b60405180910390f35b6102ac60048036038101906102a79190610def565b6105f9565b6040516102b99190610e4a565b60405180910390f35b6102dc60048036038101906102d79190610def565b610670565b6040516102e99190610e4a565b60405180910390f35b61030c60048036038101906103079190611049565b610693565b6040516103199190610e4a565b60405180910390f35b61032a6106b8565b6040516103389291906110a9565b60405180910390f35b61035b600480360381019061035691906110d2565b6106c6565b6040516103689190610e74565b60405180910390f35b60606003805461038090611141565b80601f01602080910402602001604051908101604052809291908181526020018280546103ac90611141565b80156103f95780601f106103ce576101008083540402835291602001916103f9565b820191906000526020600020905b8154815290600101906020018083116103dc57829003601f168201915b5050505050905090565b60008061040e61074d565b905061041b818585610755565b600191505092915050565b6000600254905090565b60008061043b61074d565b905061044885828561091e565b6104538585856109aa565b60019150509392505050565b60008085858590858761047291906111a1565b9261047f939291906111df565b8080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f82011690508083019250505050505050905082810151915050949350505050565b60006012905090565b6000806104e761074d565b90506105088185856104f985896106c6565b61050391906111a1565b610755565b600191505092915050565b60006001905092915050565b60008060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050919050565b60606004805461057690611141565b80601f01602080910402602001604051908101604052809291908181526020018280546105a290611141565b80156105ef5780601f106105c4576101008083540402835291602001916105ef565b820191906000526020600020905b8154815290600101906020018083116105d257829003601f168201915b5050505050905090565b60008061060461074d565b9050600061061282866106c6565b905083811015610657576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161064e9061128c565b60405180910390fd5b6106648286868403610755565b60019250505092915050565b60008061067b61074d565b90506106888185856109aa565b600191505092915050565b6000806106a28585600c610c20565b90506106ae8184610670565b9150509392505050565b600080306000915091509091565b6000600160008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054905092915050565b600033905090565b600073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036107c4576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016107bb9061131e565b60405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603610833576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161082a906113b0565b60405180910390fd5b80600160008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925836040516109119190610e74565b60405180910390a3505050565b600061092a84846106c6565b90507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff81146109a45781811015610996576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161098d9061141c565b60405180910390fd5b6109a38484848403610755565b5b50505050565b600073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603610a19576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610a10906114ae565b60405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603610a88576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610a7f90611540565b60405180910390fd5b610a93838383610c95565b60008060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054905081811015610b19576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610b10906115d2565b60405180910390fd5b8181036000808673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002081905550816000808573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825401925050819055508273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef84604051610c079190610e74565b60405180910390a3610c1a848484610c9a565b50505050565b60008084848490601486610c3491906111a1565b92610c41939291906111df565b8080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f82011690508083019250505050505050905060148101519150509392505050565b505050565b505050565b600081519050919050565b600082825260208201905092915050565b60005b83811015610cd9578082015181840152602081019050610cbe565b60008484015250505050565b6000601f19601f8301169050919050565b6000610d0182610c9f565b610d0b8185610caa565b9350610d1b818560208601610cbb565b610d2481610ce5565b840191505092915050565b60006020820190508181036000830152610d498184610cf6565b905092915050565b600080fd5b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610d8682610d5b565b9050919050565b610d9681610d7b565b8114610da157600080fd5b50565b600081359050610db381610d8d565b92915050565b6000819050919050565b610dcc81610db9565b8114610dd757600080fd5b50565b600081359050610de981610dc3565b92915050565b60008060408385031215610e0657610e05610d51565b5b6000610e1485828601610da4565b9250506020610e2585828601610dda565b9150509250929050565b60008115159050919050565b610e4481610e2f565b82525050565b6000602082019050610e5f6000830184610e3b565b92915050565b610e6e81610db9565b82525050565b6000602082019050610e896000830184610e65565b92915050565b600080600060608486031215610ea857610ea7610d51565b5b6000610eb686828701610da4565b9350506020610ec786828701610da4565b9250506040610ed886828701610dda565b9150509250925092565b600080fd5b600080fd5b600080fd5b60008083601f840112610f0757610f06610ee2565b5b8235905067ffffffffffffffff811115610f2457610f23610ee7565b5b602083019150836001820283011115610f4057610f3f610eec565b5b9250929050565b60008060008060608587031215610f6157610f60610d51565b5b600085013567ffffffffffffffff811115610f7f57610f7e610d56565b5b610f8b87828801610ef1565b94509450506020610f9e87828801610dda565b9250506040610faf87828801610dda565b91505092959194509250565b610fc481610d7b565b82525050565b6000602082019050610fdf6000830184610fbb565b92915050565b600060ff82169050919050565b610ffb81610fe5565b82525050565b60006020820190506110166000830184610ff2565b92915050565b60006020828403121561103257611031610d51565b5b600061104084828501610da4565b91505092915050565b60008060006040848603121561106257611061610d51565b5b600084013567ffffffffffffffff8111156110805761107f610d56565b5b61108c86828701610ef1565b9350935050602061109f86828701610dda565b9150509250925092565b60006040820190506110be6000830185610fbb565b6110cb6020830184610e65565b9392505050565b600080604083850312156110e9576110e8610d51565b5b60006110f785828601610da4565b925050602061110885828601610da4565b9150509250929050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061115957607f821691505b60208210810361116c5761116b611112565b5b50919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b60006111ac82610db9565b91506111b783610db9565b92508282019050808211156111cf576111ce611172565b5b92915050565b600080fd5b600080fd5b600080858511156111f3576111f26111d5565b5b83861115611204576112036111da565b5b6001850283019150848603905094509492505050565b7f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f7760008201527f207a65726f000000000000000000000000000000000000000000000000000000602082015250565b6000611276602583610caa565b91506112818261121a565b604082019050919050565b600060208201905081810360008301526112a581611269565b9050919050565b7f45524332303a20617070726f76652066726f6d20746865207a65726f2061646460008201527f7265737300000000000000000000000000000000000000000000000000000000602082015250565b6000611308602483610caa565b9150611313826112ac565b604082019050919050565b60006020820190508181036000830152611337816112fb565b9050919050565b7f45524332303a20617070726f766520746f20746865207a65726f20616464726560008201527f7373000000000000000000000000000000000000000000000000000000000000602082015250565b600061139a602283610caa565b91506113a58261133e565b604082019050919050565b600060208201905081810360008301526113c98161138d565b9050919050565b7f45524332303a20696e73756666696369656e7420616c6c6f77616e6365000000600082015250565b6000611406601d83610caa565b9150611411826113d0565b602082019050919050565b60006020820190508181036000830152611435816113f9565b9050919050565b7f45524332303a207472616e736665722066726f6d20746865207a65726f20616460008201527f6472657373000000000000000000000000000000000000000000000000000000602082015250565b6000611498602583610caa565b91506114a38261143c565b604082019050919050565b600060208201905081810360008301526114c78161148b565b9050919050565b7f45524332303a207472616e7366657220746f20746865207a65726f206164647260008201527f6573730000000000000000000000000000000000000000000000000000000000602082015250565b600061152a602383610caa565b9150611535826114ce565b604082019050919050565b600060208201905081810360008301526115598161151d565b9050919050565b7f45524332303a207472616e7366657220616d6f756e742065786365656473206260008201527f616c616e63650000000000000000000000000000000000000000000000000000602082015250565b60006115bc602683610caa565b91506115c782611560565b604082019050919050565b600060208201905081810360008301526115eb816115af565b905091905056fea26469706673582212203ba3e0eadcbf3df23612df3719aa28c933428a38a60e6090ad646d9d8cd23d0264736f6c634300081a0033";

type TestZRC20ConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: TestZRC20ConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class TestZRC20__factory extends ContractFactory {
  constructor(...args: TestZRC20ConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    initialSupply: PromiseOrValue<BigNumberish>,
    name: PromiseOrValue<string>,
    symbol: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<TestZRC20> {
    return super.deploy(
      initialSupply,
      name,
      symbol,
      overrides || {}
    ) as Promise<TestZRC20>;
  }
  override getDeployTransaction(
    initialSupply: PromiseOrValue<BigNumberish>,
    name: PromiseOrValue<string>,
    symbol: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(
      initialSupply,
      name,
      symbol,
      overrides || {}
    );
  }
  override attach(address: string): TestZRC20 {
    return super.attach(address) as TestZRC20;
  }
  override connect(signer: Signer): TestZRC20__factory {
    return super.connect(signer) as TestZRC20__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): TestZRC20Interface {
    return new utils.Interface(_abi) as TestZRC20Interface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): TestZRC20 {
    return new Contract(address, _abi, signerOrProvider) as TestZRC20;
  }
}
