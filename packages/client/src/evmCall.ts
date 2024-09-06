import { ethers } from "ethers";

import GatewayABI from "./abi/GatewayEVM.sol/GatewayEVM.json";
import { ZetaChainClient } from "./client";

export const evmCall = async function (
  this: ZetaChainClient,
  args: {
    receiver: string;
    gatewayEvm: string;
    callOnRevert: boolean;
    revertAddress: string;
    gasPrice: ethers.BigNumber;
    gasLimit: number;
    onRevertGasLimit: number;
    revertMessage: string;
    types: string;
    values: any[];
  }
) {
  const signer = this.signer;
  const { utils } = ethers;
  const gateway = new ethers.Contract(args.gatewayEvm, GatewayABI.abi, signer);

  const encodedParameters = utils.defaultAbiCoder.encode(
    JSON.parse(args.types),
    args.values
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
