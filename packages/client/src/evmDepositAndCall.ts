import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { ethers } from "ethers";

import {
  ERC20Contract,
  RevertOptions,
  TxOptions,
} from "../../../types/contracts.types";
import { ParseAbiValuesReturnType } from "../../../types/parseAbiValues.types";
import {
  broadcastGatewayTx,
  generateEvmDepositAndCallData,
} from "../../../utils/gatewayEvm";
import { validateSigner } from "../../../utils/validateSigner";
import { ZetaChainClient } from "./client";

/**
 * @function evmDepositAndCall
 * @description Deposits a specified amount of ERC-20 or native gas tokens and calls a universal app contract on ZetaChain.
 *
 * @param {ZetaChainClient} this - The instance of the ZetaChain client that contains the signer information.
 * @param {object} args - The function arguments.
 * @param {string} args.amount - The amount of ERC20 tokens or native currency to deposit.
 * @param {string} args.erc20 - The address of the ERC20 token contract. If depositing native currency (e.g., ETH), this can be left empty or undefined.
 * @param {string} args.gatewayEvm - The address of the ZetaChain gateway contract on the EVM-compatible blockchain.
 * @param {string} args.receiver - The address of the receiver contract or account where the function call will be executed.
 * @param {string} args.types - JSON string representing the types of the function parameters (e.g., ["uint256", "address"]).
 * @param {Array} args.values - The values to be passed to the function (should match the types).
 * @param {txOptions} args.txOptions - Transaction options, including gasLimit, gasPrice, etc.
 * @param {revertOptions} args.revertOptions - Options to handle call reversion, including revert address, message, and gas limit for the revert scenario.
 *
 * @returns {object} - Returns the transaction object.
 * @property {object} tx - The transaction object representing the deposit and function call.
 */

export const evmDepositAndCall = async function (
  this: ZetaChainClient,
  args: {
    amount: string;
    erc20?: string;
    gatewayEvm?: string;
    receiver: string;
    revertOptions: RevertOptions;
    txOptions: TxOptions;
    types: string[];
    values: ParseAbiValuesReturnType;
  }
) {
  const signer = validateSigner(this.signer);
  const gatewayEvmAddress = args.gatewayEvm || (await this.getGatewayAddress());

  // If ERC20, we need to get decimals and approve the gateway
  if (args.erc20) {
    const erc20Contract = new ethers.Contract(
      args.erc20,
      ERC20_ABI.abi,
      signer
    ) as ERC20Contract;

    const decimals = await erc20Contract.decimals();
    const value = ethers.parseUnits(args.amount, decimals);

    // Approve the gateway to spend the tokens
    await erc20Contract.approve(gatewayEvmAddress, value);

    // Generate calldata for deposit and call
    const callData = generateEvmDepositAndCallData({
      amount: args.amount,
      decimals: Number(decimals),
      erc20: args.erc20,
      gatewayEvm: gatewayEvmAddress,
      receiver: args.receiver,
      revertOptions: args.revertOptions,
      types: args.types,
      values: args.values,
    });

    const tx = await broadcastGatewayTx(signer, callData, args.txOptions);

    return tx;
  } else {
    // Native token deposit and call
    const callData = generateEvmDepositAndCallData({
      amount: args.amount,
      gatewayEvm: gatewayEvmAddress,
      receiver: args.receiver,
      revertOptions: args.revertOptions,
      types: args.types,
      values: args.values,
    });

    const tx = await broadcastGatewayTx(signer, callData, args.txOptions);

    return tx;
  }
};
