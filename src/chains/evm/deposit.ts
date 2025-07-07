import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { ethers } from "ethers";
import { z } from "zod";

import { ERC20Contract } from "../../../types/contracts.types";
import {
  broadcastGatewayTx,
  generateEvmDepositData,
} from "../../../utils/gatewayEvm";
import { getGatewayAddressFromSigner } from "../../../utils/getAddress";
import { validateAndParseSchema } from "../../../utils/validateAndParseSchema";
import { evmDepositParamsSchema, evmOptionsSchema } from "../../schemas/evm";

type evmDepositParams = z.infer<typeof evmDepositParamsSchema>;
type evmOptions = z.infer<typeof evmOptionsSchema>;

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
  const validatedParams = validateAndParseSchema(
    params,
    evmDepositParamsSchema
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

    // Generate calldata for deposit
    const callData = generateEvmDepositData({
      amount: validatedParams.amount,
      decimals: Number(decimals),
      erc20: validatedParams.token,
      receiver: validatedParams.receiver,
      revertOptions: validatedParams.revertOptions,
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
    // Native token deposit
    const callData = generateEvmDepositData({
      amount: validatedParams.amount,
      receiver: validatedParams.receiver,
      revertOptions: validatedParams.revertOptions,
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
