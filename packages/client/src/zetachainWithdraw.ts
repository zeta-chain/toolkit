import GatewayABI from "@zetachain/protocol-contracts/abi/GatewayZEVM.sol/GatewayZEVM.json";
import ZRC20ABI from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import { ethers } from "ethers";

import { ZetaChainClient } from "./client";
import type { revertOptions, txOptions } from "./types";

/**
 * @function zetachainWithdraw
 * @description Withdraws a specified amount of ZRC20 tokens from ZetaChain to a connected chain.
 *
 * @param {ZetaChainClient} this - The instance of the ZetaChain client that contains the signer information.
 * @param {object} args - The function arguments.
 * @param {string} args.amount - The amount of ZRC20 tokens to withdraw.
 * @param {string} args.gatewayZetaChain - The address of the ZetaChain gateway contract.
 * @param {string} args.receiver - The address that will receive the withdrawn ZRC20 tokens.
 * @param {string} args.zrc20 - The address of the ZRC20 token contract from which the withdrawal will be made.
 * @param {txOptions} args.txOptions - Transaction options such as gasPrice, nonce, etc.
 * @param {revertOptions} args.revertOptions - Options to handle call reversion, including revert address and message.
 *
 * @returns {object} - Returns an object containing the transaction, gas token, and gas fee.
 * @property {object} tx - The transaction object for the withdrawal.
 * @property {string} gasZRC20 - The address of the ZRC20 gas token.
 * @property {ethers.BigNumber} gasFee - The amount of gas fee paid for the transaction.
 */

export const zetachainWithdraw = async function (
  this: ZetaChainClient,
  args: {
    amount: string;
    gatewayZetaChain?: string;
    receiver: string;
    revertOptions: revertOptions;
    txOptions: txOptions;
    zrc20: string;
  }
) {
  const signer = this.signer;
  const { utils } = ethers;

  const gatewayZetaChainAddress =
    args.gatewayZetaChain || (await this.getGatewayAddress());
  const gateway = new ethers.Contract(
    gatewayZetaChainAddress,
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

  const zrc20 = new ethers.Contract(args.zrc20, ZRC20ABI.abi, signer);
  const decimals = await zrc20.decimals();
  const value = utils.parseUnits(args.amount, decimals);
  const [gasZRC20, gasFee] = await zrc20.withdrawGasFee();
  if (args.zrc20 === gasZRC20) {
    const approveGasAndWithdraw = await zrc20.approve(
      gatewayZetaChainAddress,
      value.add(gasFee),
      args.txOptions
    );
    await approveGasAndWithdraw.wait();
  } else {
    const gasZRC20Contract = new ethers.Contract(
      gasZRC20,
      ZRC20ABI.abi,
      signer
    );
    const approveGas = await gasZRC20Contract.approve(
      gatewayZetaChainAddress,
      gasFee,
      args.txOptions
    );
    await approveGas.wait();
    const approveWithdraw = await zrc20.approve(
      gatewayZetaChainAddress,
      value,
      args.txOptions
    );
    await approveWithdraw.wait();
  }
  const method =
    "withdraw(bytes,uint256,address,(address,bool,address,bytes,uint256))";
  const tx = await gateway[method](
    utils.hexlify(args.receiver),
    value,
    args.zrc20,
    revertOptions,
    args.txOptions
  );
  return { gasFee, gasZRC20, tx };
};
