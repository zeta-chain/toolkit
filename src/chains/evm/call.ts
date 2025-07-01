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
