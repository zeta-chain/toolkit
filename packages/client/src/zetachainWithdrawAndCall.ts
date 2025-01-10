import GatewayABI from "@zetachain/protocol-contracts/abi/GatewayZEVM.sol/GatewayZEVM.json";
import ZRC20ABI from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import { ethers } from "ethers";

import { ZetaChainClient } from "./client";
import type { revertOptions, txOptions } from "./types";

/**
 * @function zetachainWithdrawAndCall
 * @description Withdraws a specified amount of ZRC20 tokens and makes a function call on the target contract on a connected chain.
 *
 * @param {ZetaChainClient} this - The instance of the ZetaChain client that contains the signer information.
 * @param {object} args - The function arguments.
 * @param {string} args.amount - The amount of ZRC20 tokens to withdraw.
 * @param {string} args.function - The name of the function to be called on the target contract.
 * @param {string} args.gatewayZetaChain - The address of the ZetaChain gateway contract.
 * @param {string} args.receiver - The address that will receive the withdrawn ZRC20 tokens or the contract to interact with.
 * @param {string} args.types - JSON string representing the types of the function parameters (e.g., ["uint256", "address"]).
 * @param {Array} args.values - The values to be passed to the function (should match the types).
 * @param {string} args.zrc20 - The address of the ZRC20 token contract used for the withdrawal and fee payment.
 * @param {any} args.callOptions - Call options.
 * @param {txOptions} args.txOptions - Transaction options such as gasPrice, nonce, etc.
 * @param {revertOptions} args.revertOptions - Options to handle call reversion, including revert address and message.
 *
 * @returns {object} - Returns an object containing the transaction, gas token, and gas fee.
 * @property {object} tx - The transaction object for the withdrawal and contract call.
 * @property {string} gasZRC20 - The address of the ZRC20 gas token.
 * @property {ethers.BigNumber} gasFee - The amount of gas fee paid for the transaction.
 */

export const zetachainWithdrawAndCall = async function (
  this: ZetaChainClient,
  args: {
    amount: string;
    callOptions: any;
    function?: string;
    gatewayZetaChain?: string;
    receiver: string;
    revertOptions: revertOptions;
    txOptions: txOptions;
    types: string[];
    values: any[];
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

  const valuesArray = args.values.map((value, index) => {
    const type = args.types[index];

    if (type === "bool") {
      try {
        return JSON.parse(value.toLowerCase());
      } catch (e) {
        throw new Error(`Invalid boolean value: ${value}`);
      }
    } else if (type.startsWith("uint") || type.startsWith("int")) {
      return ethers.BigNumber.from(value);
    } else {
      return value;
    }
  });

  const encodedParameters = utils.defaultAbiCoder.encode(
    args.types,
    valuesArray
  );

  let message;

  if (args.callOptions.isArbitraryCall && args.function) {
    let functionSignature = ethers.utils.id(args.function).slice(0, 10);
    message = ethers.utils.hexlify(
      ethers.utils.concat([functionSignature, encodedParameters])
    );
  } else {
    message = encodedParameters;
  }

  const zrc20 = new ethers.Contract(args.zrc20, ZRC20ABI.abi, signer);
  const decimals = await zrc20.decimals();
  const value = utils.parseUnits(args.amount, decimals);
  const [gasZRC20, gasFee] = await zrc20.withdrawGasFeeWithGasLimit(
    args.callOptions.gasLimit
  );
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
    "withdrawAndCall(bytes,uint256,address,bytes,(uint256,bool),(address,bool,address,bytes,uint256))";
  const tx = await gateway[method](
    utils.hexlify(args.receiver),
    value,
    args.zrc20,
    message,
    args.callOptions,
    revertOptions,
    args.txOptions
  );
  return { gasFee, gasZRC20, tx };
};
