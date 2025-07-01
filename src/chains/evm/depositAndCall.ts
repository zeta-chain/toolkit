import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { ethers } from "ethers";

import {
  ERC20Contract,
  RevertOptions,
  TxOptions,
} from "../../../types/contracts.types";
import { ParseAbiValuesReturnType } from "../../../types/parseAbiValues.types";
import {
  broadcastGatewayTx,
  generateEvmDepositAndCallData,
} from "../../../utils/gatewayEvm";
import { getGatewayAddressFromSigner } from "../../../utils/getAddress";

type evmDepositAndCallParams = {
  amount: string;
  receiver: string;
  revertOptions: RevertOptions;
  token?: string;
  types: string[];
  values: ParseAbiValuesReturnType;
};

type evmOptions = {
  gateway?: string;
  signer: ethers.Wallet;
  txOptions?: TxOptions;
};

export const evmDepositAndCall = async (
  params: evmDepositAndCallParams,
  options: evmOptions
) => {
  const gatewayAddress =
    options.gateway || (await getGatewayAddressFromSigner(options.signer));

  if (params.token) {
    const erc20Contract = new ethers.Contract(
      params.token,
      ERC20_ABI.abi,
      options.signer
    ) as ERC20Contract;

    const decimals = await erc20Contract.decimals();
    const value = ethers.parseUnits(params.amount, decimals);

    // Approve the gateway to spend the tokens
    const approval = await erc20Contract.approve(gatewayAddress, value);
    await approval.wait();

    // Generate calldata for deposit and call
    const callData = generateEvmDepositAndCallData({
      amount: params.amount,
      decimals: Number(decimals),
      erc20: params.token,
      receiver: params.receiver,
      revertOptions: params.revertOptions,
      types: params.types,
      values: params.values,
    });

    const tx = await broadcastGatewayTx({
      signer: options.signer,
      txData: {
        data: callData.data,
        to: gatewayAddress,
        value: callData.value,
      },
      txOptions: options.txOptions || {},
    });
    return tx;
  } else {
    // Native token deposit and call
    const callData = generateEvmDepositAndCallData({
      amount: params.amount,
      receiver: params.receiver,
      revertOptions: params.revertOptions,
      types: params.types,
      values: params.values,
    });

    const tx = await broadcastGatewayTx({
      signer: options.signer,
      txData: {
        data: callData.data,
        to: gatewayAddress,
        value: callData.value,
      },
      txOptions: options.txOptions || {},
    });
    return tx;
  }
};
