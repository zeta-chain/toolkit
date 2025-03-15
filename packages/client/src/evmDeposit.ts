import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import GatewayABI from "@zetachain/protocol-contracts/abi/GatewayEVM.sol/GatewayEVM.json";
import { ethers } from "ethers";

import {
  ERC20Contract,
  GatewayContract,
  RevertOptions,
  TxOptions,
} from "../../../types/contracts.types";
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
  const signer = this.signer;

  if (!signer) {
    throw new Error("Signer is undefined. Please provide a valid signer.");
  }

  const { utils } = ethers;
  const gatewayEvmAddress = args.gatewayEvm || (await this.getGatewayAddress());
  const gateway = new ethers.Contract(
    gatewayEvmAddress,
    GatewayABI.abi,
    signer
  ) as GatewayContract;

  const revertOptions = {
    abortAddress: "0x0000000000000000000000000000000000000000", // not used
    callOnRevert: args.revertOptions.callOnRevert,
    onRevertGasLimit: args.revertOptions.onRevertGasLimit,
    revertAddress: args.revertOptions.revertAddress,
    // not used
    revertMessage: utils.hexlify(
      utils.toUtf8Bytes(args.revertOptions.revertMessage)
    ),
  };

  const txOptions = {
    gasLimit: args.txOptions.gasLimit,
    gasPrice: args.txOptions.gasPrice,
  };
  let tx;
  if (args.erc20) {
    const erc20Contract = new ethers.Contract(
      args.erc20,
      ERC20_ABI.abi,
      signer
    ) as ERC20Contract;

    const decimals = await erc20Contract.decimals();
    const value = utils.parseUnits(args.amount, decimals);

    const connectedContract = erc20Contract.connect(signer) as ERC20Contract;

    await connectedContract.approve(gatewayEvmAddress, value);

    tx = await gateway.deposit(
      args.receiver,
      value,
      args.erc20,
      revertOptions,
      txOptions
    );
  } else {
    const value = utils.parseEther(args.amount);

    tx = await gateway.deposit(args.receiver, revertOptions, {
      ...txOptions,
      value,
    });
  }

  return tx;
};
