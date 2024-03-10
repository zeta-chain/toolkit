import { ethers } from "ethers";

export const prepareData = (contract: string, types: string[], args: any[]) => {
  const params = prepareParams(types, args);
  return `${contract}${params.slice(2)}`;
};

export const prepareParams = (types: string[], args: any[]) => {
  const abiCoder = ethers.utils.defaultAbiCoder;
  for (let i = 0; i < args.length; i++) {
    if (types[i] === "bytes32") {
      args[i] = ethers.utils.hexlify(ethers.utils.zeroPad(args[i], 32));
    }
  }
  return abiCoder.encode(types, args);
};
