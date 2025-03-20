import { AbiCoder, BytesLike, ethers } from "ethers";

export type SupportedArgType =
  | string
  | bigint
  | boolean
  | Uint8Array
  | BytesLike;

export const prepareData = (
  contract: string,
  types: string[],
  args: SupportedArgType[]
) => {
  const params = prepareParams(types, args);
  return `${contract}${params.slice(2)}`;
};

export const prepareParams = (types: string[], args: SupportedArgType[]) => {
  const abiCoder = AbiCoder.defaultAbiCoder();
  for (let i = 0; i < args.length; i++) {
    if (types[i] === "bytes32" && ethers.isBytesLike(args[i])) {
      args[i] = ethers.hexlify(ethers.zeroPadBytes(args[i] as BytesLike, 32));
    }
  }
  return abiCoder.encode(types, args);
};
