import GatewayABI from "@zetachain/protocol-contracts/abi/GatewayZEVM.sol/GatewayZEVM.json";
import ZRC20ABI from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import { AbiCoder, ethers, NonceManager } from "ethers";
import { z } from "zod";

import { GatewayContract, ZRC20Contract } from "../../../types/contracts.types";
import { getGatewayAddressFromSigner } from "../../../utils/getAddress";
import { handleError } from "../../../utils/handleError";
import { toHexString } from "../../../utils/toHexString";
import { validateAndParseSchema } from "../../../utils/validateAndParseSchema";
import {
  zetachainOptionsSchema,
  zetachainWithdrawAndCallParamsSchema,
} from "../../schemas/zetachain";

type ZetachainWithdrawAndCallParams = z.infer<
  typeof zetachainWithdrawAndCallParamsSchema
>;
type ZetachainWithdrawAndCallOptions = z.infer<typeof zetachainOptionsSchema>;

/**
 * Withdraws tokens and makes a cross-chain call from ZetaChain to a destination chain
 *
 * This function combines token withdrawal with a contract call in a single transaction.
 * It allows you to transfer ZRC20 tokens from ZetaChain to a destination chain and
 * immediately execute a function call on that chain. It automatically handles gas
 * fee calculation and approval.
 *
 * @param params - The withdrawal and call parameters including amount, receiver address, call data, gas options, and ZRC20 token
 * @param options - Configuration options including signer and optional gateway address
 * @returns Promise that resolves to an object containing gas fee, gas ZRC20 address, and transaction receipt
 */
export const zetachainWithdrawAndCall = async (
  params: ZetachainWithdrawAndCallParams,
  options: ZetachainWithdrawAndCallOptions
) => {
  const validatedParams = validateAndParseSchema(
    params,
    zetachainWithdrawAndCallParamsSchema
  );
  const validatedOptions = validateAndParseSchema(
    options,
    zetachainOptionsSchema
  );

  const gatewayAddress =
    validatedOptions.gateway ||
    (await getGatewayAddressFromSigner(validatedOptions.signer));

  const nonceManager = new NonceManager(validatedOptions.signer);

  const gateway = new ethers.Contract(
    gatewayAddress,
    GatewayABI.abi,
    nonceManager
  ) as GatewayContract;

  const revertOptions = {
    ...validatedParams.revertOptions,
    revertMessage: toHexString(validatedParams.revertOptions.revertMessage),
  };

  let message: string;

  if (validatedParams.data) {
    // For non-EVM chains, use the raw data directly
    message = validatedParams.data.startsWith("0x")
      ? validatedParams.data
      : `0x${validatedParams.data}`;
  } else if (
    validatedParams.types &&
    validatedParams.values &&
    validatedParams.function
  ) {
    // For EVM chains, encode the function and parameters
    const abiCoder = AbiCoder.defaultAbiCoder();
    const encodedParameters = abiCoder.encode(
      validatedParams.types,
      validatedParams.values
    );

    if (validatedParams.callOptions.isArbitraryCall) {
      const functionSignature = ethers
        .id(validatedParams.function)
        .slice(0, 10);
      message = ethers.hexlify(
        ethers.concat([functionSignature, encodedParameters])
      );
    } else {
      message = encodedParameters;
    }
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
    validatedParams.zrc20,
    ZRC20ABI.abi,
    nonceManager
  ) as ZRC20Contract;
  const decimals = await zrc20.decimals();
  const value = ethers.parseUnits(validatedParams.amount, decimals);
  const [gasZRC20, gasFee] = await zrc20.withdrawGasFeeWithGasLimit(
    validatedParams.callOptions.gasLimit
  );

  if (validatedParams.zrc20 === gasZRC20) {
    const approveGasAndWithdraw = await zrc20.approve(
      gatewayAddress,
      value + gasFee,
      { ...validatedOptions.txOptions }
    );
    await approveGasAndWithdraw.wait();
  } else {
    const gasZRC20Contract = new ethers.Contract(
      gasZRC20,
      ZRC20ABI.abi,
      nonceManager
    ) as ZRC20Contract;
    const approveGas = await gasZRC20Contract.approve(gatewayAddress, gasFee, {
      ...validatedOptions.txOptions,
    });
    await approveGas.wait();
    const approveWithdraw = await zrc20.approve(gatewayAddress, value, {
      ...validatedOptions.txOptions,
    });
    await approveWithdraw.wait();
  }

  const receiver = toHexString(validatedParams.receiver);

  const withdrawAndCallAbiSignature =
    "withdrawAndCall(bytes,uint256,address,bytes,(uint256,bool),(address,bool,address,bytes,uint256))";
  const gatewayWithdrawAndCallFunction = gateway[
    withdrawAndCallAbiSignature
  ] as GatewayContract["withdrawAndCall"];

  const tx = await gatewayWithdrawAndCallFunction(
    receiver,
    value,
    validatedParams.zrc20,
    message,
    validatedParams.callOptions,
    revertOptions,
    { ...validatedOptions.txOptions }
  );

  return {
    gasFee,
    gasZRC20,
    tx,
  };
};
