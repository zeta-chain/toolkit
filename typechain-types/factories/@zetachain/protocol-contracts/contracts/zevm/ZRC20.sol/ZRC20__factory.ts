/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Contract,
  ContractFactory,
  ContractTransactionResponse,
  Interface,
} from "ethers";
import type {
  Signer,
  BigNumberish,
  AddressLike,
  ContractDeployTransaction,
  ContractRunner,
} from "ethers";
import type { NonPayableOverrides } from "../../../../../../common";
import type {
  ZRC20,
  ZRC20Interface,
} from "../../../../../../@zetachain/protocol-contracts/contracts/zevm/ZRC20.sol/ZRC20";

const _abi = [
  {
    inputs: [
      {
        internalType: "string",
        name: "name_",
        type: "string",
      },
      {
        internalType: "string",
        name: "symbol_",
        type: "string",
      },
      {
        internalType: "uint8",
        name: "decimals_",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "chainid_",
        type: "uint256",
      },
      {
        internalType: "enum CoinType",
        name: "coinType_",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "gasLimit_",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "systemContractAddress_",
        type: "address",
      },
      {
        internalType: "address",
        name: "gatewayAddress_",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "CallerIsNotFungibleModule",
    type: "error",
  },
  {
    inputs: [],
    name: "GasFeeTransferFailed",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidSender",
    type: "error",
  },
  {
    inputs: [],
    name: "LowAllowance",
    type: "error",
  },
  {
    inputs: [],
    name: "LowBalance",
    type: "error",
  },
  {
    inputs: [],
    name: "ZeroAddress",
    type: "error",
  },
  {
    inputs: [],
    name: "ZeroGasCoin",
    type: "error",
  },
  {
    inputs: [],
    name: "ZeroGasPrice",
    type: "error",
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
        indexed: false,
        internalType: "bytes",
        name: "from",
        type: "bytes",
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
    name: "Deposit",
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
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "gasLimit",
        type: "uint256",
      },
    ],
    name: "UpdatedGasLimit",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "gateway",
        type: "address",
      },
    ],
    name: "UpdatedGateway",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "protocolFlatFee",
        type: "uint256",
      },
    ],
    name: "UpdatedProtocolFlatFee",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "systemContract",
        type: "address",
      },
    ],
    name: "UpdatedSystemContract",
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
        indexed: false,
        internalType: "bytes",
        name: "to",
        type: "bytes",
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
        name: "gasFee",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "protocolFlatFee",
        type: "uint256",
      },
    ],
    name: "Withdrawal",
    type: "event",
  },
  {
    inputs: [],
    name: "CHAIN_ID",
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
    inputs: [],
    name: "COIN_TYPE",
    outputs: [
      {
        internalType: "enum CoinType",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "FUNGIBLE_MODULE_ADDRESS",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "GAS_LIMIT",
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
    inputs: [],
    name: "PROTOCOL_FLAT_FEE",
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
    inputs: [],
    name: "SYSTEM_CONTRACT_ADDRESS",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
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
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "burn",
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
    inputs: [],
    name: "gatewayAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
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
    inputs: [
      {
        internalType: "string",
        name: "newName",
        type: "string",
      },
    ],
    name: "setName",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "newSymbol",
        type: "string",
      },
    ],
    name: "setSymbol",
    outputs: [],
    stateMutability: "nonpayable",
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
        name: "recipient",
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
        name: "sender",
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
        internalType: "uint256",
        name: "gasLimit_",
        type: "uint256",
      },
    ],
    name: "updateGasLimit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "addr",
        type: "address",
      },
    ],
    name: "updateGatewayAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "protocolFlatFee_",
        type: "uint256",
      },
    ],
    name: "updateProtocolFlatFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "addr",
        type: "address",
      },
    ],
    name: "updateSystemContractAddress",
    outputs: [],
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
  {
    inputs: [
      {
        internalType: "uint256",
        name: "gasLimit",
        type: "uint256",
      },
    ],
    name: "withdrawGasFeeWithGasLimit",
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
  "0x60c06040523461041a57611879803803806100198161041f565b92833981016101008282031261041a5781516001600160401b03811161041a5781610045918401610444565b602083015190916001600160401b03821161041a57610065918401610444565b9160408101519160ff831680930361041a576060820151936080830151600381101561041a5760a0840151916100a960e06100a260c088016104af565b96016104af565b946001600160a01b03169384158015610409575b6103f8578051906001600160401b0382116102f55760065490600182811c921680156103ee575b60208310146102d55781601f84931161037e575b50602090601f83116001146103165760009261030b575b50508160011b916000199060031b1c1916176006555b8051906001600160401b0382116102f55760075490600182811c921680156102eb575b60208310146102d55781601f849311610265575b50602090601f83116001146101fd576000926101f2575b50508160011b916000199060031b1c1916176007555b6008549560805260a05260015560018060a01b03196000541617600055610100600160a81b039060081b169160018060a81b03191617176008556040516113b590816104c4823960805181818161016b01528181610b3e01526110c7015260a051816109e40152f35b015190503880610173565b600760009081528281209350601f198516905b81811061024d5750908460019594939210610234575b505050811b01600755610189565b015160001960f88460031b161c19169055388080610226565b92936020600181928786015181550195019301610210565b60076000529091507fa66cc928b5edb82af9bd49922954155ab7b0942694bea4ce44661d9a8736c688601f840160051c810191602085106102cb575b90601f859493920160051c01905b8181106102bc575061015c565b600081558493506001016102af565b90915081906102a1565b634e487b7160e01b600052602260045260246000fd5b91607f1691610148565b634e487b7160e01b600052604160045260246000fd5b01519050388061010f565b600660009081528281209350601f198516905b818110610366575090846001959493921061034d575b505050811b01600655610125565b015160001960f88460031b161c1916905538808061033f565b92936020600181928786015181550195019301610329565b60066000529091507ff652222313e28459528d920b65115c16c04f3efc82aaedc97be59f3f377c0d3f601f840160051c810191602085106103e4575b90601f859493920160051c01905b8181106103d557506100f8565b600081558493506001016103c8565b90915081906103ba565b91607f16916100e4565b63d92e233d60e01b60005260046000fd5b506001600160a01b038616156100bd565b600080fd5b6040519190601f01601f191682016001600160401b038111838210176102f557604052565b81601f8201121561041a578051906001600160401b0382116102f557610473601f8301601f191660200161041f565b928284526020838301011161041a5760005b82811061049a57505060206000918301015290565b80602080928401015182828701015201610485565b51906001600160a01b038216820361041a5756fe608080604052600436101561001357600080fd5b60003560e01c90816306fdde0314610e7057508063091d278814610e52578063095ea7b314610e2c57806318160ddd14610e0e57806323b872dd14610d8d578063313ce56714610d6c5780633ce4a5bc14610d3d57806342966c6814610d2057806347e7ef2414610bb95780634d8943bb14610b9b57806370a0823114610b6157806385e1f4d014610b265780638b851b9514610afc57806395d89b4114610a2c578063a3413d03146109d1578063a9059cbb146109a0578063b84c82461461083b578063c47f0027146106c0578063c70126261461055e578063c835d7cc146104d5578063ccc775991461042f578063d9eeebed14610416578063dd62ed3e146103c5578063eddeb12314610365578063f2441b321461033c578063f687d12a146102cb5763fc5fecd51461014857600080fd5b346102c65760203660031901126102c657600054604051630be1554760e01b81527f00000000000000000000000000000000000000000000000000000000000000006004820181905290916001600160a01b031690602083602481855afa92831561027857600093610295575b506001600160a01b038316156102845760209060246040518094819363d7fd7afb60e01b835260048301525afa90811561027857600091610243575b508015610232576102086102119160043590611095565b600254906110a8565b604080516001600160a01b03939093168352602083019190915290f35b0390f35b630e661aed60e41b60005260046000fd5b906020823d602011610270575b8161025d60209383610f71565b8101031261026d575051386101f1565b80fd5b3d9150610250565b6040513d6000823e3d90fd5b633c7ff9cb60e11b60005260046000fd5b6102b891935060203d6020116102bf575b6102b08183610f71565b810190611076565b91386101b5565b503d6102a6565b600080fd5b346102c65760203660031901126102c65760043573735b14bb79463307aacbed86daf3322b1e6226ab330361032b576020817fff5788270f43bfc1ca41c503606d2594aa3023a1a7547de403a3e2f146a4a80a92600155604051908152a1005b632b2add3d60e01b60005260046000fd5b346102c65760003660031901126102c6576000546040516001600160a01b039091168152602090f35b346102c65760203660031901126102c65760043573735b14bb79463307aacbed86daf3322b1e6226ab330361032b576020817fef13af88e424b5d15f49c77758542c1938b08b8b95b91ed0751f98ba99000d8f92600255604051908152a1005b346102c65760403660031901126102c6576103de610f45565b6103e6610f5b565b6001600160a01b039182166000908152600460209081526040808320949093168252928352819020549051908152f35b346102c65760003660031901126102c6576102116110b5565b346102c65760203660031901126102c657610448610f45565b73735b14bb79463307aacbed86daf3322b1e6226ab330361032b576001600160a01b0381169081156104c45760088054610100600160a81b03191691811b610100600160a81b03169190911790556040519081527f88815d964e380677e86d817e7d65dea59cb7b4c3b5b7a0c8ec7ea4a74f90a38790602090a1005b63d92e233d60e01b60005260046000fd5b346102c65760203660031901126102c6576104ee610f45565b73735b14bb79463307aacbed86daf3322b1e6226ab330361032b576001600160a01b031680156104c4576020817fd55614e962c5fd6ece71614f6348d702468a997a394dd5e5c1677950226d97ae926bffffffffffffffffffffffff60a01b6000541617600055604051908152a1005b346102c65760403660031901126102c65760043567ffffffffffffffff81116102c657366023820112156102c6576105a0903690602481600401359101610f93565b60206024359160006105b06110b5565b93906064604051809481936323b872dd60e01b835233600484015273735b14bb79463307aacbed86daf3322b1e6226ab602484015288604484015260018060a01b03165af190811561027857600091610681575b5015610670577f9ffbffc04a397460ee1dbe8c9503e098090567d6b7f4b3c02a8617d800b6d9559161063684336112c5565b6002549061064f60405193608085526080850190610f04565b946020840152604083015260608201528033930390a2602060405160018152f35b63053e6b6b60e11b60005260046000fd5b6020813d6020116106b8575b8161069a60209383610f71565b810103126106b4575190811515820361026d575084610604565b5080fd5b3d915061068d565b346102c6576106ce36610fda565b73735b14bb79463307aacbed86daf3322b1e6226ab330361032b57805167ffffffffffffffff811161082557610705600654611019565b601f81116107b8575b50602091601f821160011461074c57918192600092610741575b5050600019600383901b1c191660019190911b17600655005b015190508280610728565b601f1982169260066000526000805160206113608339815191529160005b8581106107a057508360019510610787575b505050811b01600655005b015160001960f88460031b161c1916905582808061077c565b9192602060018192868501518155019401920161076a565b6006600052601f820160051c60008051602061136083398151915201906020831061080f575b601f0160051c60008051602061136083398151915201905b818110610803575061070e565b600081556001016107f6565b60008051602061136083398151915291506107de565b634e487b7160e01b600052604160045260246000fd5b346102c65761084936610fda565b73735b14bb79463307aacbed86daf3322b1e6226ab330361032b57805167ffffffffffffffff811161082557610880600754611019565b601f8111610933575b50602091601f82116001146108c7579181926000926108bc575b5050600019600383901b1c191660019190911b17600755005b0151905082806108a3565b601f1982169260076000526000805160206113408339815191529160005b85811061091b57508360019510610902575b505050811b01600755005b015160001960f88460031b161c191690558280806108f7565b919260206001819286850151815501940192016108e5565b6007600052601f820160051c60008051602061134083398151915201906020831061098a575b601f0160051c60008051602061134083398151915201905b81811061097e5750610889565b60008155600101610971565b6000805160206113408339815191529150610959565b346102c65760403660031901126102c6576109c66109bc610f45565b602435903361121f565b602060405160018152f35b346102c65760003660031901126102c6577f00000000000000000000000000000000000000000000000000000000000000006040516003821015610a16576020918152f35b634e487b7160e01b600052602160045260246000fd5b346102c65760003660031901126102c6576040516000600754610a4e81611019565b8084529060018116908115610ad85750600114610a8a575b61022e83610a7681850382610f71565b604051918291602083526020830190610f04565b9190506007600052600080516020611340833981519152916000905b808210610abe57509091508101602001610a76610a66565b919260018160209254838588010152019101909291610aa6565b60ff191660208086019190915291151560051b84019091019150610a769050610a66565b346102c65760003660031901126102c65760088054604051911c6001600160a01b03168152602090f35b346102c65760003660031901126102c65760206040517f00000000000000000000000000000000000000000000000000000000000000008152f35b346102c65760203660031901126102c6576001600160a01b03610b82610f45565b1660005260036020526020604060002054604051908152f35b346102c65760003660031901126102c6576020600254604051908152f35b346102c65760403660031901126102c657610bd2610f45565b6024359073735b14bb79463307aacbed86daf3322b1e6226ab33141580610d0b575b80610cf3575b610ce2576001600160a01b03169081156104c457610cce81610c3f7f67fc7bdaed5b0ec550d8706b87d60568ab70c6b781263c70101d54cd1564aab3936005546110a8565b6005558360005260036020526040600020610c5b8282546110a8565b90558360007fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef6020604051858152a360405173735b14bb79463307aacbed86daf3322b1e6226ab60601b60208201526014815290610cba603483610f71565b604051928392604084526040840190610f04565b9060208301520390a2602060405160018152f35b636edaef2f60e11b60005260046000fd5b506008805433911c6001600160a01b03161415610bfa565b506000546001600160a01b0316331415610bf4565b346102c65760203660031901126102c6576109c6600435336112c5565b346102c65760003660031901126102c657602060405173735b14bb79463307aacbed86daf3322b1e6226ab8152f35b346102c65760003660031901126102c657602060ff60085416604051908152f35b346102c65760603660031901126102c657610da6610f45565b610dae610f5b565b90610dbd60443580938361121f565b6001600160a01b0381166000908152600460209081526040808320338452909152902054828110610dfd576109c692610df591611053565b9033906111b8565b6310bad14760e01b60005260046000fd5b346102c65760003660031901126102c6576020600554604051908152f35b346102c65760403660031901126102c6576109c6610e48610f45565b60243590336111b8565b346102c65760003660031901126102c6576020600154604051908152f35b346102c65760003660031901126102c6576000600654610e8f81611019565b8084529060018116908115610ad85750600114610eb65761022e83610a7681850382610f71565b9190506006600052600080516020611360833981519152916000905b808210610eea57509091508101602001610a76610a66565b919260018160209254838588010152019101909291610ed2565b919082519283825260005b848110610f30575050826000602080949584010152601f8019910116010190565b80602080928401015182828601015201610f0f565b600435906001600160a01b03821682036102c657565b602435906001600160a01b03821682036102c657565b90601f8019910116810190811067ffffffffffffffff82111761082557604052565b92919267ffffffffffffffff82116108255760405191610fbd601f8201601f191660200184610f71565b8294818452818301116102c6578281602093846000960137010152565b60206003198201126102c6576004359067ffffffffffffffff82116102c657806023830112156102c65781602461101693600401359101610f93565b90565b90600182811c92168015611049575b602083101461103357565b634e487b7160e01b600052602260045260246000fd5b91607f1691611028565b9190820391821161106057565b634e487b7160e01b600052601160045260246000fd5b908160209103126102c657516001600160a01b03811681036102c65790565b8181029291811591840414171561106057565b9190820180921161106057565b600054604051630be1554760e01b81527f0000000000000000000000000000000000000000000000000000000000000000600482018190529092916001600160a01b031690602084602481855afa93841561027857600094611197575b506001600160a01b038416156102845760209060246040518094819363d7fd7afb60e01b835260048301525afa90811561027857600091611165575b508015610232576102086110169160015490611095565b906020823d60201161118f575b8161117f60209383610f71565b8101031261026d5750513861114e565b3d9150611172565b6111b191945060203d6020116102bf576102b08183610f71565b9238611112565b6001600160a01b03169081156104c4576001600160a01b03169182156104c45760207f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925918360005260048252604060002085600052825280604060002055604051908152a3565b6001600160a01b03169081156104c4576001600160a01b03169182156104c4578160005260036020526040600020548181106112b457816112837fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef93602093611053565b8460005260038352604060002055846000526003825260406000206112a98282546110a8565b9055604051908152a3565b63fe382aa760e01b60005260046000fd5b6001600160a01b031680156104c457806000526003602052604060002054918083106112b45760208161131b7fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef93600096611053565b84865260038352604086205561133381600554611053565b600555604051908152a356fea66cc928b5edb82af9bd49922954155ab7b0942694bea4ce44661d9a8736c688f652222313e28459528d920b65115c16c04f3efc82aaedc97be59f3f377c0d3fa26469706673582212204c90788866e311a7988ea7e33ebbb42bc4848ee95a9a8938bd2520623824a00064736f6c634300081a0033";

type ZRC20ConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: ZRC20ConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class ZRC20__factory extends ContractFactory {
  constructor(...args: ZRC20ConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override getDeployTransaction(
    name_: string,
    symbol_: string,
    decimals_: BigNumberish,
    chainid_: BigNumberish,
    coinType_: BigNumberish,
    gasLimit_: BigNumberish,
    systemContractAddress_: AddressLike,
    gatewayAddress_: AddressLike,
    overrides?: NonPayableOverrides & { from?: string }
  ): Promise<ContractDeployTransaction> {
    return super.getDeployTransaction(
      name_,
      symbol_,
      decimals_,
      chainid_,
      coinType_,
      gasLimit_,
      systemContractAddress_,
      gatewayAddress_,
      overrides || {}
    );
  }
  override deploy(
    name_: string,
    symbol_: string,
    decimals_: BigNumberish,
    chainid_: BigNumberish,
    coinType_: BigNumberish,
    gasLimit_: BigNumberish,
    systemContractAddress_: AddressLike,
    gatewayAddress_: AddressLike,
    overrides?: NonPayableOverrides & { from?: string }
  ) {
    return super.deploy(
      name_,
      symbol_,
      decimals_,
      chainid_,
      coinType_,
      gasLimit_,
      systemContractAddress_,
      gatewayAddress_,
      overrides || {}
    ) as Promise<
      ZRC20 & {
        deploymentTransaction(): ContractTransactionResponse;
      }
    >;
  }
  override connect(runner: ContractRunner | null): ZRC20__factory {
    return super.connect(runner) as ZRC20__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ZRC20Interface {
    return new Interface(_abi) as ZRC20Interface;
  }
  static connect(address: string, runner?: ContractRunner | null): ZRC20 {
    return new Contract(address, _abi, runner) as unknown as ZRC20;
  }
}
