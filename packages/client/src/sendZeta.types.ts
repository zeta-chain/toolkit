import { ethers } from "ethers";

export type ZetaTokenContract = ethers.Contract & {
  approve: (
    spender: string,
    value: ethers.BigNumber
  ) => Promise<ethers.ContractTransaction>;
};

export const sendFunctionAbi = [
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
];

interface SendInput {
  destinationAddress: ethers.BytesLike;
  destinationChainId: ethers.BigNumberish;
  destinationGasLimit: ethers.BigNumberish;
  message: ethers.BytesLike;
  zetaParams: ethers.BytesLike;
  zetaValueAndGas: ethers.BigNumberish;
}

export interface ZetaConnectorContract extends ethers.Contract {
  send: (input: SendInput) => Promise<ethers.ContractTransaction>;
}
