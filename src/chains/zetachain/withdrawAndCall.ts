import GatewayABI from "@zetachain/protocol-contracts/abi/GatewayZEVM.sol/GatewayZEVM.json";
import ZRC20ABI from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import { AbiCoder, ethers, NonceManager } from "ethers";
import { z } from "zod";

import { GatewayContract, ZRC20Contract } from "../../../types/contracts.types";
import { getGatewayAddressFromSigner } from "../../../utils/getAddress";
import { handleError } from "../../../utils/handleError";
import { toHexString } from "../../../utils/toHexString";
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
    const abiCoder = AbiCoder.defaultAbiCoder();
    const encodedParameters = abiCoder.encode(params.types, params.values);

    if (params.callOptions.isArbitraryCall) {
      const functionSignature = ethers.id(params.function).slice(0, 10);
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
    params.zrc20,
    ZRC20ABI.abi,
    nonceManager
  ) as ZRC20Contract;
  const decimals = await zrc20.decimals();
  const value = ethers.parseUnits(params.amount, decimals);
  const [gasZRC20, gasFee] = await zrc20.withdrawGasFeeWithGasLimit(
    params.callOptions.gasLimit
  );

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

  const withdrawAndCallAbiSignature =
    "withdrawAndCall(bytes,uint256,address,bytes,(uint256,bool),(address,bool,address,bytes,uint256))";
  const gatewayWithdrawAndCallFunction = gateway[
    withdrawAndCallAbiSignature
  ] as GatewayContract["withdrawAndCall"];

  const tx = await gatewayWithdrawAndCallFunction(
    receiver,
    value,
    params.zrc20,
    message,
    params.callOptions,
    revertOptions,
    { ...options.txOptions }
  );

  return {
    gasFee,
    gasZRC20,
    tx,
  };
};
