import { ethers } from "ethers";

import { RevertOptions, TxOptions } from "../../../types/contracts.types";
import { ParseAbiValuesReturnType } from "../../../types/parseAbiValues.types";
import {
  broadcastGatewayTx,
  generateEvmCallData,
} from "../../../utils/gatewayEvm";
import { getGatewayAddressFromSigner } from "../../../utils/getAddress";

type evmCallParams = {
  receiver: string;
  revertOptions: RevertOptions;
  types: string[];
  values: ParseAbiValuesReturnType;
};

type evmOptions = {
  gateway?: string;
  signer: ethers.Wallet;
  txOptions?: TxOptions;
};

/**
 * Makes a cross-chain call from an EVM chain to a universal contract on ZetaChain.
 *
 * This function allows you to call a contract function on a destination EVM chain
 * without transferring any tokens. It's useful for executing contract logic
 * across different chains.
 *
 * @param params - The call parameters including receiver address, function types/values, and revert options
 * @param options - Configuration options including signer and optional gateway address
 * @returns Promise that resolves to the transaction receipt
 */
export const evmCall = async (params: evmCallParams, options: evmOptions) => {
  const gatewayAddress =
    options.gateway || (await getGatewayAddressFromSigner(options.signer));

  const callData = generateEvmCallData({
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
    },
    txOptions: options.txOptions || {},
  });

  return tx;
};
