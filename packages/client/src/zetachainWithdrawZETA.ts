import { ethers } from "ethers";

import GatewayABI from "./abi/GatewayZEVM.sol/GatewayZEVM.json";
import { ZetaChainClient } from "./client";
import type { revertOptions, txOptions } from "./types";

/**
 * @function zetachainWithdrawZETA
 * @description Withdraws a specified amount of ZETA tokens from ZetaChain to a connected chain.
 *
 * @param {ZetaChainClient} this - The instance of the ZetaChain client that contains the signer information.
 * @param {object} args - The function arguments.
 * @param {string} args.amount - The amount of ZETA tokens to withdraw.
 * @param {string} args.gatewayZetaChain - The address of the ZetaChain gateway contract.
 * @param {string} args.receiver - The address that will receive the withdrawn ZETA tokens.
 * @param {string} args.chainId - The chain ID of the connected chain.
 * @param {txOptions} args.txOptions - Transaction options such as gasPrice, nonce, etc.
 * @param {revertOptions} args.revertOptions - Options to handle call reversion, including revert address and message.
 *
 * @returns {object} - Returns an object containing the transaction, gas token, and gas fee.
 * @property {object} tx - The transaction object for the withdrawal.
 */

export const zetachainWithdrawZETA = async function (
  this: ZetaChainClient,
  args: {
    amount: string;
    gatewayZetaChain: string;
    receiver: string;
    revertOptions: revertOptions;
    txOptions: txOptions;
    chainId: string;
  }
) {
  const signer = this.signer;
  const { utils } = ethers;

  const gateway = new ethers.Contract(
    args.gatewayZetaChain,
    GatewayABI.abi,
    signer
  );

  const revertOptions = {
    abortAddress: "0x0000000000000000000000000000000000000000",
    callOnRevert: args.revertOptions.callOnRevert,
    onRevertGasLimit: args.revertOptions.onRevertGasLimit,
    revertAddress: args.revertOptions.revertAddress,
    revertMessage: utils.hexlify(
      utils.toUtf8Bytes(args.revertOptions.revertMessage)
    ),
  };

  const value = utils.parseUnits(args.amount, 18);

  const method =
    "withdraw(bytes,uint256,uint256,(address,bool,address,bytes,uint256))";
  const tx = await gateway[method](
    utils.hexlify(args.receiver),
    value,
    args.chainId,
    revertOptions,
    args.txOptions
  );
  return { tx };
};
