declare const hre: any;

export const prepareData = (contract: string, types: string[], args: any[]) => {
  const params = prepareParams(types, args);
  return `${contract}${params.slice(2)}`;
};

export const prepareParams = (types: string[], args: any[]) => {
  const abiCoder = hre.ethers.utils.defaultAbiCoder;
  for (let i = 0; i < args.length; i++) {
    if (types[i] === "bytes32" && typeof args[i] === "string") {
      args[i] = hre.ethers.utils.hexlify(hre.ethers.utils.zeroPad(args[i], 32));
    }
  }
  return abiCoder.encode(types, args);
};
