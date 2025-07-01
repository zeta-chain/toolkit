import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { ethers } from "ethers";

import {
  ERC20Contract,
  RevertOptions,
  TxOptions,
} from "../../../types/contracts.types";
import {
  broadcastGatewayTx,
  generateEvmDepositData,
} from "../../../utils/gatewayEvm";
import { getGatewayAddressFromSigner } from "../../../utils/getAddress";

type evmDepositParams = {
  amount: string;
  receiver: string;
  revertOptions: RevertOptions;
  token?: string;
};

type evmOptions = {
  gateway?: string;
  signer: ethers.Wallet;
  txOptions?: TxOptions;
};

/**
 * Deposits tokens from an EVM chain to ZetaChain.
 *
 * This function allows you to transfer tokens from an EVM chain to ZetaChain.
 * It supports both native tokens (ETH, BNB, AVAX, etc.) and ERC20 tokens.
 * For ERC20 tokens, it automatically handles token approval before deposit.
 *
 * @param params - The deposit parameters including amount, receiver, token address, and revert options
 * @param options - Configuration options including signer and optional gateway address
 * @returns Promise that resolves to the transaction receipt
 */
export const evmDeposit = async (
  params: evmDepositParams,
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

    // Generate calldata for deposit
    const callData = generateEvmDepositData({
      amount: params.amount,
      decimals: Number(decimals),
      erc20: params.token,
      receiver: params.receiver,
      revertOptions: params.revertOptions,
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
    // Native token deposit
    const callData = generateEvmDepositData({
      amount: params.amount,
      receiver: params.receiver,
      revertOptions: params.revertOptions,
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
