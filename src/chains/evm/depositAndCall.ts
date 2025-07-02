import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { ethers } from "ethers";
import { z } from "zod";

import { ERC20Contract } from "../../../types/contracts.types";
import {
  broadcastGatewayTx,
  generateEvmDepositAndCallData,
} from "../../../utils/gatewayEvm";
import { getGatewayAddressFromSigner } from "../../../utils/getAddress";
import { validateAndParseSchema } from "../../../utils/validateAndParseSchema";
import {
  evmDepositAndCallParamsSchema,
  evmOptionsSchema,
} from "../../schemas/evm";

type evmDepositAndCallParams = z.infer<typeof evmDepositAndCallParamsSchema>;
type evmOptions = z.infer<typeof evmOptionsSchema>;

/**
 * Deposits tokens and makes a cross-chain call from an EVM chain to a universal contract on ZetaChain.
 *
 * This function combines token deposit with a contract call in a single transaction.
 * It allows you to transfer tokens from an EVM chain to ZetaChain and immediately
 * execute a function call on the universal contract. Supports both native tokens
 * and ERC20 tokens.
 *
 * @param params - The deposit and call parameters including amount, receiver, token address, function types/values, and revert options
 * @param options - Configuration options including signer and optional gateway address
 * @returns Promise that resolves to the transaction receipt
 */
export const evmDepositAndCall = async (
  params: evmDepositAndCallParams,
  options: evmOptions
) => {
  const validatedParams = validateAndParseSchema(
    params,
    evmDepositAndCallParamsSchema
  );
  const validatedOptions = validateAndParseSchema(options, evmOptionsSchema);

  const gatewayAddress =
    validatedOptions.gateway ||
    (await getGatewayAddressFromSigner(validatedOptions.signer));

  if (validatedParams.token) {
    const erc20Contract = new ethers.Contract(
      validatedParams.token,
      ERC20_ABI.abi,
      validatedOptions.signer
    ) as ERC20Contract;

    const decimals = await erc20Contract.decimals();
    const value = ethers.parseUnits(validatedParams.amount, decimals);

    // Approve the gateway to spend the tokens
    const approval = await erc20Contract.approve(gatewayAddress, value);
    await approval.wait();

    // Generate calldata for deposit and call
    const callData = generateEvmDepositAndCallData({
      amount: validatedParams.amount,
      decimals: Number(decimals),
      erc20: validatedParams.token,
      receiver: validatedParams.receiver,
      revertOptions: validatedParams.revertOptions,
      types: validatedParams.types,
      values: validatedParams.values,
    });

    const tx = await broadcastGatewayTx({
      signer: validatedOptions.signer,
      txData: {
        data: callData.data,
        to: gatewayAddress,
        value: callData.value,
      },
      txOptions: validatedOptions.txOptions || {},
    });
    return tx;
  } else {
    // Native token deposit and call
    const callData = generateEvmDepositAndCallData({
      amount: validatedParams.amount,
      receiver: validatedParams.receiver,
      revertOptions: validatedParams.revertOptions,
      types: validatedParams.types,
      values: validatedParams.values,
    });

    const tx = await broadcastGatewayTx({
      signer: validatedOptions.signer,
      txData: {
        data: callData.data,
        to: gatewayAddress,
        value: callData.value,
      },
      txOptions: validatedOptions.txOptions || {},
    });
    return tx;
  }
};
