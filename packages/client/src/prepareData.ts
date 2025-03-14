import { BytesLike, ethers } from "ethers";
import { isBytesLike } from "ethers/lib/utils";

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
  const abiCoder = ethers.utils.defaultAbiCoder;
  for (let i = 0; i < args.length; i++) {
    if (types[i] === "bytes32" && isBytesLike(args[i])) {
      args[i] = ethers.utils.hexlify(
        ethers.utils.zeroPad(args[i] as BytesLike, 32)
      );
    }
  }
  return abiCoder.encode(types, args);
};
