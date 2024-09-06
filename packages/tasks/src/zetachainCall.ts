import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import GatewayABI from "./abi/GatewayZEVM.sol/GatewayZEVM.json";
import ZRC20ABI from "./abi/ZRC20.sol/ZRC20.json";

export const zetachainCall = async (
  args: any,
  hre: HardhatRuntimeEnvironment
) => {
  const [signer] = await hre.ethers.getSigners();
  console.log("Signer address:", signer.address);
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

  const functionSignature = utils.id(args.function).slice(0, 10);
  const encodedParameters = utils.defaultAbiCoder.encode(
    JSON.parse(args.types),
    args.values
  );

  const message = utils.hexlify(
    utils.concat([functionSignature, encodedParameters])
  );

  try {
    const zrc20 = new hre.ethers.Contract(args.zrc20, ZRC20ABI.abi, signer);
    const decimals = await zrc20.decimals();
    const approve = await zrc20.approve(
      args.gatewayZetaChain,
      utils.parseUnits(args.amount, decimals),
      txOptions
    );
    await approve.wait();
    const tx = await gateway[
      "call(bytes,address,bytes,uint256,(address,bool,address,bytes,uint256))"
    ](
      utils.hexlify(args.receiver),
      args.zrc20,
      message,
      args.callGasLimit,
      revertOptions,
      txOptions
    );

    const receipt = await tx.wait();
    console.log("Transaction hash:", receipt.transactionHash);
  } catch (e) {
    console.error("Transaction error:", e);
  }
};

task("zetachain-call", "Call a contract on a connected chain", zetachainCall)
  .addOptionalParam(
    "gatewayZetaChain",
    "contract address of gateway on ZetaChain",
    "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0"
  )
  .addParam("zrc20", "The address of ZRC-20 to pay fees")
  .addFlag("callOnRevert", "Whether to call on revert")
  .addOptionalParam(
    "revertAddress",
    "Revert address",
    "0x0000000000000000000000000000000000000000"
  )
  .addOptionalParam(
    "callGasLimit",
    "The gas limit for the transaction",
    7000000,
    types.int
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
  .addParam("amount", "The amount of tokens to pay for gas")
  .addParam("function", "Function to call (example: 'hello(string)')")
  .addParam("types", "The types of the parameters (example: ['string'])")
  .addVariadicPositionalParam("values", "The values of the parameters");
