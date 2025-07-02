import GatewayABI from "@zetachain/protocol-contracts/abi/GatewayZEVM.sol/GatewayZEVM.json";
import ZRC20ABI from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import { AbiCoder, ethers, NonceManager } from "ethers";
import { z } from "zod";

import { GatewayContract, ZRC20Contract } from "../../../types/contracts.types";
import { getGatewayAddressFromSigner } from "../../../utils/getAddress";
import { handleError } from "../../../utils/handleError";
import { toHexString } from "../../../utils/toHexString";
import {
  zetachainCallParamsSchema,
  zetachainOptionsSchema,
} from "../../schemas/zetachain";

type ZetachainCallParams = z.infer<typeof zetachainCallParamsSchema>;
type ZetachainCallOptions = z.infer<typeof zetachainOptionsSchema>;

/**
 * Makes a cross-chain call from ZetaChain to another chain
 *
 * This function allows you to call a contract on a destination chain
 * from a universal contract on ZetaChain without transferring any tokens.
 * It automatically handles gas fee calculation and approval using the specified ZRC20 token.
 *
 * @param params - The call parameters including receiver address, call data, gas options, and ZRC20 token
 * @param options - Configuration options including signer and optional gateway address
 * @returns Promise that resolves to an object containing gas fee, gas ZRC20 address, and transaction receipt
 */
export const zetachainCall = async (
  params: ZetachainCallParams,
  options: ZetachainCallOptions
) => {
  const gatewayAddress =
    options.gateway || (await getGatewayAddressFromSigner(options.signer));
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

  let message: string;

  if (params.data) {
    // For non-EVM chains, use the raw data directly
    message = params.data.startsWith("0x") ? params.data : `0x${params.data}`;
  } else if (params.types && params.values && params.function) {
    // For EVM chains, encode the function and parameters
    const functionSignature = ethers.id(params.function).slice(0, 10);
    const abiCoder = AbiCoder.defaultAbiCoder();
    const encodedParameters = abiCoder.encode(params.types, params.values);
    message = ethers.hexlify(
      ethers.concat([functionSignature, encodedParameters])
    );
  } else {
    const errorMessage = handleError({
      context: "Invalid arguments",
      error: new Error(
        "Either provide 'data' OR provide all three of 'function', 'types', and 'values' together. These two approaches are mutually exclusive."
      ),
      shouldThrow: false,
    });

    throw new Error(errorMessage);
  }

  const zrc20 = new ethers.Contract(
    params.zrc20,
    ZRC20ABI.abi,
    nonceManager
  ) as ZRC20Contract;

  const [gasZRC20, gasFee] = await zrc20.withdrawGasFeeWithGasLimit(
    params.callOptions.gasLimit
  );
  const gasZRC20Contract = new ethers.Contract(
    gasZRC20,
    ZRC20ABI.abi,
    nonceManager
  ) as ZRC20Contract;

  const approve = await gasZRC20Contract.approve(gatewayAddress, gasFee, {
    ...options.txOptions,
  });

  await approve.wait();

  const receiver = toHexString(params.receiver);

  const callAbiSignature =
    "call(bytes,address,bytes,(uint256,bool),(address,bool,address,bytes,uint256))";
  const gatewayCallFunction = gateway[
    callAbiSignature
  ] as GatewayContract["call"];

  const tx = await gatewayCallFunction(
    receiver,
    gasZRC20,
    message,
    params.callOptions,
    revertOptions,
    { ...options.txOptions }
  );

  return { gasFee, gasZRC20, tx };
};
