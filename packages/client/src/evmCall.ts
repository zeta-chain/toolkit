import { ethers } from "ethers";

import GatewayABI from "./abi/GatewayEVM.sol/GatewayEVM.json";
import { ZetaChainClient } from "./client";

export const evmCall = async function (
  this: ZetaChainClient,
  args: {
    callOnRevert: boolean;
    gasLimit: number;
    gasPrice: ethers.BigNumber;
    gatewayEvm: string;
    onRevertGasLimit: number;
    receiver: string;
    revertAddress: string;
    revertMessage: string;
    types: string;
    values: any[];
  }
) {
  const signer = this.signer;
  const { utils } = ethers;
  const gateway = new ethers.Contract(args.gatewayEvm, GatewayABI.abi, signer);

  const typesArray = JSON.parse(args.types);
  const valuesArray = args.values.map((value, index) => {
    const type = typesArray[index];

    if (type === "bool") {
      try {
        return JSON.parse(value.toLowerCase());
      } catch (e) {
        throw new Error(`Invalid boolean value: ${value}`);
      }
    } else if (type.startsWith("uint") || type.startsWith("int")) {
      return ethers.BigNumber.from(value);
    } else {
      return value;
    }
  });

  const encodedParameters = utils.defaultAbiCoder.encode(
    typesArray,
    valuesArray
  );

  const tx = await gateway[
    "call(address,bytes,(address,bool,address,bytes,uint256))"
  ](
    args.receiver,
    encodedParameters,
    {
      abortAddress: "0x0000000000000000000000000000000000000000",
      callOnRevert: args.callOnRevert,
      onRevertGasLimit: args.onRevertGasLimit,
      revertAddress: args.revertAddress,
      revertMessage: utils.hexlify(utils.toUtf8Bytes(args.revertMessage)),
    },
    {
      gasLimit: args.gasLimit,
      gasPrice: args.gasPrice,
    }
  );

  return tx;
};
