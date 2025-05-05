import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { ethers } from "ethers";

import {
  ERC20Contract,
  RevertOptions,
  TxOptions,
} from "../../../types/contracts.types";
import {
  broadcastGatewayTx,
  generateEvmDepositData,
} from "../../../utils/gatewayEvm";
import { validateSigner } from "../../../utils/validateSigner";
import { ZetaChainClient } from "./client";

/**
 * @function evmDeposit
 * @description Deposits a specified amount of ERC-20 or native gas tokens to a receiver on ZetaChain.
 *
 * @param {ZetaChainClient} this - The instance of the ZetaChain client that contains the signer information.
 * @param {object} args - The function arguments.
 * @param {string} args.amount - The amount of ERC20 tokens or native currency to deposit.
 * @param {string} args.erc20 - The address of the ERC20 token contract. If depositing native currency (e.g., ETH), this can be left empty or undefined.
 * @param {string} args.gatewayEvm - The address of the ZetaChain gateway contract on the EVM-compatible blockchain.
 * @param {string} args.receiver - The address of the receiver or target contract for the deposit.
 * @param {txOptions} args.txOptions - Transaction options, including gasLimit, gasPrice, etc.
 * @param {revertOptions} args.revertOptions - Options to handle call reversion, including revert address, message, and gas limit for the revert scenario.
 *
 * @returns {object} - Returns the transaction object.
 * @property {object} tx - The transaction object representing the deposit transaction.
 */

export const evmDeposit = async function (
  this: ZetaChainClient,
  args: {
    amount: string;
    erc20?: string;
    gatewayEvm?: string;
    receiver: string;
    revertOptions: RevertOptions;
    txOptions: TxOptions;
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

    // Generate calldata for deposit
    const callData = generateEvmDepositData({
      amount: args.amount,
      decimals: Number(decimals),
      erc20: args.erc20,
      receiver: args.receiver,
      revertOptions: args.revertOptions,
    });

    const tx = await broadcastGatewayTx({
      signer,
      txData: {
        data: callData.data,
        to: gatewayEvmAddress,
        value: callData.value,
      },
      txOptions: args.txOptions,
    });
    return tx;
  } else {
    // Native token deposit
    const callData = generateEvmDepositData({
      amount: args.amount,
      receiver: args.receiver,
      revertOptions: args.revertOptions,
    });

    const tx = await broadcastGatewayTx({
      signer,
      txData: {
        data: callData.data,
        to: gatewayEvmAddress,
        value: callData.value,
      },
      txOptions: args.txOptions,
    });
    return tx;
  }
};
