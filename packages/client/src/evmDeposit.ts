import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { ethers } from "ethers";

import GatewayABI from "./abi/GatewayEVM.sol/GatewayEVM.json";
import { ZetaChainClient } from "./client";

export const evmDeposit = async function (
  this: ZetaChainClient,
  args: {
    amount: string;
    callOnRevert: boolean;
    erc20: string;
    gasLimit: number;
    gasPrice: ethers.BigNumber;
    gatewayEvm: string;
    onRevertGasLimit: number;
    receiver: string;
    revertAddress: string;
    revertMessage: string;
  }
) {
  const signer = this.signer;
  const { utils } = ethers;
  const gateway = new ethers.Contract(args.gatewayEvm, GatewayABI.abi, signer);

  const revertOptions = {
    abortAddress: "0x0000000000000000000000000000000000000000",
    callOnRevert: args.callOnRevert,
    onRevertGasLimit: args.onRevertGasLimit,
    revertAddress: args.revertAddress,
    // not used
    revertMessage: utils.hexlify(utils.toUtf8Bytes(args.revertMessage)),
  };

  const txOptions = {
    gasLimit: args.gasLimit,
    gasPrice: args.gasPrice,
  };
  let tx;
  if (args.erc20) {
    const erc20Contract = new ethers.Contract(
      args.erc20,
      ERC20_ABI.abi,
      signer
    );
    const decimals = await erc20Contract.decimals();
    const value = utils.parseUnits(args.amount, decimals);
    await erc20Contract.connect(signer).approve(args.gatewayEvm, value);
    const method =
      "deposit(address,uint256,address,(address,bool,address,bytes,uint256))";
    tx = await gateway[method](
      args.receiver,
      value,
      args.erc20,
      revertOptions,
      txOptions
    );
  } else {
    const value = utils.parseEther(args.amount);
    const method = "deposit(address,(address,bool,address,bytes,uint256))";
    tx = await gateway[method](args.receiver, revertOptions, {
      ...txOptions,
      value,
    });
  }

  return tx;
};
