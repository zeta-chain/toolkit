import GatewayABI from "@zetachain/protocol-contracts/abi/GatewayZEVM.sol/GatewayZEVM.json";
import ZRC20ABI from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import { ethers, NonceManager } from "ethers";

import {
  GatewayContract,
  RevertOptions,
  TxOptions,
  ZRC20Contract,
} from "../../../types/contracts.types";
import { toHexString } from "../../../utils/toHexString";

type ZetachainWithdrawParams = {
  amount: string;
  receiver: string;
  revertOptions: RevertOptions;
  zrc20: string;
};

type ZetachainWithdrawOptions = {
  gateway?: string;
  signer: ethers.Wallet;
  txOptions?: TxOptions;
};

export const zetachainWithdraw = async (
  params: ZetachainWithdrawParams,
  options: ZetachainWithdrawOptions
) => {
  const gatewayAddress = options.gateway;
  if (!gatewayAddress) {
    throw new Error("Gateway ZetaChain address is required");
  }

  const nonceManager = new NonceManager(options.signer);

  const gateway = new ethers.Contract(
    gatewayAddress,
    GatewayABI.abi,
    nonceManager
  ) as GatewayContract;

  const revertOptions = {
    ...params.revertOptions,
    revertMessage: toHexString(params.revertOptions.revertMessage),
  };

  const zrc20 = new ethers.Contract(
    params.zrc20,
    ZRC20ABI.abi,
    nonceManager
  ) as ZRC20Contract;

  const decimals = await zrc20.decimals();
  const value = ethers.parseUnits(params.amount, decimals);
  const [gasZRC20, gasFee] = await zrc20.withdrawGasFee();

  if (params.zrc20 === gasZRC20) {
    const approveGasAndWithdraw = await zrc20.approve(
      gatewayAddress,
      value + ethers.toBigInt(gasFee),
      { ...options.txOptions }
    );
    await approveGasAndWithdraw.wait();
  } else {
    const gasZRC20Contract = new ethers.Contract(
      gasZRC20,
      ZRC20ABI.abi,
      nonceManager
    ) as ZRC20Contract;
    const approveGas = await gasZRC20Contract.approve(gatewayAddress, gasFee, {
      ...options.txOptions,
    });
    await approveGas.wait();
    const approveWithdraw = await zrc20.approve(gatewayAddress, value, {
      ...options.txOptions,
    });
    await approveWithdraw.wait();
  }
  const receiver = toHexString(params.receiver);

  const withdrawAbiSignature =
    "withdraw(bytes,uint256,address,(address,bool,address,bytes,uint256))";
  const gatewayWithdrawFunction = gateway[
    withdrawAbiSignature
  ] as GatewayContract["withdraw"];

  const tx = await gatewayWithdrawFunction(
    receiver,
    value,
    params.zrc20,
    revertOptions,
    options.txOptions
  );
  return { gasFee, gasZRC20, tx };
};
