import GatewayABI from "@zetachain/protocol-contracts/abi/GatewayZEVM.sol/GatewayZEVM.json";
import ZRC20ABI from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import { AbiCoder, ethers } from "ethers";

import {
  CallOptions,
  GatewayContract,
  RevertOptions,
  TxOptions,
  ZRC20Contract,
} from "../../../types/contracts.types";
import { ParseAbiValuesReturnType } from "../../../types/parseAbiValues.types";
import { handleError } from "../../../utils/handleError";
import { toHexString } from "../../../utils/toHexString";
import { validateSigner } from "../../../utils/validateSigner";
import { ZetaChainClient } from "./client";

/**
 * @function zetachainCall
 * @description Calls a contract on a connected chain.
 *
 * @param {ZetaChainClient} this - The instance of the ZetaChain client that contains the signer information.
 * @param {object} args - The function arguments.
 * @param {string} args.function - The name of the function to be executed on the target contract.
 * @param {string} args.gatewayZetaChain - The address of the ZetaChain gateway contract.
 * @param {string} args.receiver - The address of the contract or account that will receive the call.
 * @param {string} args.types - JSON string representing the types of the function parameters (e.g., ["uint256", "address"]).
 * @param {Array} args.values - The values to be passed to the function (should match the types).
 * @param {string} args.zrc20 - The address of the ZRC20 token contract used for paying gas fees.
 * @param {object} args.callOptions - Call options.
 * @param {txOptions} args.txOptions - Transaction options such as gasPrice, nonce, etc.
 * @param {revertOptions} args.revertOptions - Options to handle call reversion, including revert address and message.
 * @param {string} args.data - Optional raw data for non-EVM chains like Solana.
 *
 * @returns {object} - Returns an object containing the transaction, gas token, and gas fee.
 * @property {object} tx - The transaction object for the cross-chain call.
 * @property {string} gasZRC20 - The address of the ZRC20 gas token.
 * @property {ethers.BigNumber} gasFee - The amount of gas fee paid for the transaction.
 */

export const zetachainCall = async function (
  this: ZetaChainClient,
  args: {
    callOptions: CallOptions;
    data?: string;
    function?: string;
    gatewayZetaChain?: string;
    receiver: string;
    revertOptions: RevertOptions;
    txOptions: TxOptions;
    types?: string[];
    values?: ParseAbiValuesReturnType;
    zrc20: string;
  }
) {
  const signer = validateSigner(this.signer);

  const gatewayZetaChainAddress =
    args.gatewayZetaChain || (await this.getGatewayAddress());
  const gateway = new ethers.Contract(
    gatewayZetaChainAddress,
    GatewayABI.abi,
    signer
  ) as GatewayContract;

  const revertOptions = {
    ...args.revertOptions,
    revertMessage: toHexString(args.revertOptions.revertMessage),
  };

  let message: string;

  if (args.data) {
    // For non-EVM chains, use the raw data directly
    message = args.data.startsWith("0x") ? args.data : `0x${args.data}`;
  } else if (args.types && args.values && args.function) {
    // For EVM chains, encode the function and parameters
    const functionSignature = ethers.id(args.function).slice(0, 10);
    const abiCoder = AbiCoder.defaultAbiCoder();
    const encodedParameters = abiCoder.encode(args.types, args.values);
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
    args.zrc20,
    ZRC20ABI.abi,
    signer
  ) as ZRC20Contract;

  const [gasZRC20, gasFee] = await zrc20.withdrawGasFeeWithGasLimit(
    args.callOptions.gasLimit
  );
  const gasZRC20Contract = new ethers.Contract(
    gasZRC20,
    ZRC20ABI.abi,
    signer
  ) as ZRC20Contract;

  const approve = await gasZRC20Contract.approve(
    gatewayZetaChainAddress,
    gasFee,
    args.txOptions
  );

  await approve.wait();

  const receiver = toHexString(args.receiver);

  const callAbiSignature =
    "call(bytes,address,bytes,(uint256,bool),(address,bool,address,bytes,uint256))";
  const gatewayCallFunction = gateway[
    callAbiSignature
  ] as GatewayContract["call"];

  const tx = await gatewayCallFunction(
    receiver,
    gasZRC20,
    message,
    args.callOptions,
    revertOptions,
    args.txOptions
  );

  return { gasFee, gasZRC20, tx };
};
