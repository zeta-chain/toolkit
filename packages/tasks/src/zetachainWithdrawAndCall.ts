import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import GatewayABI from "./abi/GatewayZEVM.sol/GatewayZEVM.json";
import ZRC20ABI from "./abi/ZRC20.sol/ZRC20.json";

export const zetachainWithdrawAndCall = async (
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
    const value = utils.parseUnits(args.amount, decimals);
    const [gasZRC20, gasFee] = await zrc20.withdrawGasFeeWithGasLimit(
      args.gasLimit
    );
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
      "withdrawAndCall(bytes,uint256,address,bytes,uint256,(address,bool,address,bytes,uint256))";
    const tx = await gateway[method](
      utils.hexlify(args.receiver),
      value,
      args.zrc20,
      message,
      args.gasLimit,
      revertOptions,
      txOptions
    );

    const receipt = await tx.wait();
    console.log("Transaction hash:", receipt.transactionHash);
  } catch (e) {
    console.error("Transaction error:", e);
  }
};

task(
  "zetachain-withdraw-and-call",
  "Withdraw tokens from ZetaChain and call a contract",
  zetachainWithdrawAndCall
)
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
  .addParam("amount", "The amount of tokens to send")
  .addParam("function", "Function to call (example: 'hello(string)')")
  .addParam("types", "The types of the parameters (example: ['string'])")
  .addVariadicPositionalParam("values", "The values of the parameters");
