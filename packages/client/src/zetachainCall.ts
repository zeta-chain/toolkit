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
import { toHexString } from "../../../utils";
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
    function: string;
    gatewayZetaChain?: string;
    receiver: string;
    revertOptions: RevertOptions;
    txOptions: TxOptions;
    types: string[];
    values: ParseAbiValuesReturnType;
    zrc20: string;
  }
) {
  const signer = this.signer;
  const gatewayZetaChainAddress =
    args.gatewayZetaChain || (await this.getGatewayAddress());
  const gateway = new ethers.Contract(
    gatewayZetaChainAddress,
    GatewayABI.abi,
    signer
  ) as GatewayContract;

  const revertOptions = {
    abortAddress: "0x0000000000000000000000000000000000000000", // not used
    callOnRevert: args.revertOptions.callOnRevert,
    onRevertGasLimit: args.revertOptions.onRevertGasLimit,
    revertAddress: args.revertOptions.revertAddress,
    revertMessage: toHexString(args.revertOptions.revertMessage),
  };

  const functionSignature = ethers.id(args.function).slice(0, 10);

  const abiCoder = AbiCoder.defaultAbiCoder();
  const encodedParameters = abiCoder.encode(args.types, args.values);

  const message = ethers.hexlify(
    ethers.concat([functionSignature, encodedParameters])
  );
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
