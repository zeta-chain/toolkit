import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import GatewayABI from "./abi/GatewayZEVM.sol/GatewayZEVM.json";
import ZRC20ABI from "@zetachain/protocol-contracts/abi/zevm/ZRC20.sol/ZRC20.json";

export const zetachainWithdraw = async (
  args: any,
  hre: HardhatRuntimeEnvironment
) => {
  const [signer] = await hre.ethers.getSigners();
  const { utils } = hre.ethers;

  const gateway = new hre.ethers.Contract(
    args.gatewayZetaChain,
    GatewayABI.abi,
    signer
  );

  const revertOptions = {
    revertAddress: args.revertAddress,
    callOnRevert: args.callOnRevert,
    abortAddress: "0x0000000000000000000000000000000000000000", // not used
    revertMessage: utils.hexlify(utils.toUtf8Bytes(args.revertMessage)),
    onRevertGasLimit: args.onRevertGasLimit,
  };

  const txOptions = {
    gasPrice: args.gasPrice,
    gasLimit: args.gasLimit,
  };

  try {
    const zrc20 = new hre.ethers.Contract(args.zrc20, ZRC20ABI.abi, signer);
    const decimals = await zrc20.decimals();
    const value = utils.parseUnits(args.amount, decimals);
    const [gasZRC20, gasFee] = await zrc20.withdrawGasFee();
    if (args.zrc20 === gasZRC20) {
      const approveGasAndWithdraw = await zrc20.approve(
        args.gatewayZetaChain,
        value.add(gasFee),
        txOptions
      );
      await approveGasAndWithdraw.wait();
    } else {
      const gasZRC20Contract = new hre.ethers.Contract(
        gasZRC20,
        ZRC20ABI.abi,
        signer
      );
      const approveGas = await gasZRC20Contract.approve(
        args.gatewayZetaChain,
        gasFee,
        txOptions
      );
      await approveGas.wait();
      const approveWithdraw = await zrc20.approve(
        args.gatewayZetaChain,
        value,
        txOptions
      );
      await approveWithdraw.wait();
    }
    const method =
      "withdraw(bytes,uint256,address,(address,bool,address,bytes,uint256))";
    const tx = await gateway[method](
      utils.hexlify(args.receiver),
      value,
      args.zrc20,
      revertOptions,
      txOptions
    );

    const receipt = await tx.wait();
    console.log("Transaction hash:", receipt.transactionHash);
  } catch (e) {
    console.error("Transaction error:", e);
  }
};

task("zetachain-withdraw", "Withdraw tokens from ZetaChain", zetachainWithdraw)
  .addOptionalParam(
    "gatewayZetaChain",
    "contract address of gateway on ZetaChain",
    "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0"
  )
  .addOptionalParam("zrc20", "The address of the ZRC20 token")
  .addFlag("callOnRevert", "Whether to call on revert")
  .addOptionalParam(
    "revertAddress",
    "Revert address",
    "0x0000000000000000000000000000000000000000"
  )
  .addOptionalParam(
    "gasPrice",
    "The gas price for the transaction",
    10000000000,
    types.int
  )
  .addOptionalParam(
    "gasLimit",
    "The gas limit for the transaction",
    7000000,
    types.int
  )
  .addOptionalParam("revertMessage", "Revert message", "0x")
  .addParam(
    "receiver",
    "The address of the receiver contract on a connected chain"
  )
  .addOptionalParam(
    "onRevertGasLimit",
    "The gas limit for the revert transaction",
    7000000,
    types.int
  )
  .addParam("amount", "The amount of tokens to send");
