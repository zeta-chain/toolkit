import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import GatewayABI from "@zetachain/protocol-contracts/abi/GatewayEVM.sol/GatewayEVM.json";
import { ethers } from "ethers";

import {
  ERC20Contract,
  GatewayContract,
  RevertOptions,
  TxOptions,
} from "../../../types/contracts.types";
import { toHexString, validateSigner } from "../../../utils";
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
  const gateway = new ethers.Contract(
    gatewayEvmAddress,
    GatewayABI.abi,
    signer
  ) as GatewayContract;

  const revertOptions = {
    ...args.revertOptions,
    revertMessage: toHexString(args.revertOptions.revertMessage),
  };

  let tx;
  if (args.erc20) {
    const erc20Contract = new ethers.Contract(
      args.erc20,
      ERC20_ABI.abi,
      signer
    ) as ERC20Contract;

    const decimals = await erc20Contract.decimals();
    const value = ethers.parseUnits(args.amount, decimals);

    const connectedContract = erc20Contract.connect(signer) as ERC20Contract;

    await connectedContract.approve(gatewayEvmAddress, value);

    const depositAbiSignature =
      "deposit(address,uint256,address,(address,bool,address,bytes,uint256))";
    const gatewayDepositFunction = gateway[
      depositAbiSignature
    ] as GatewayContract["deposit"];

    tx = await gatewayDepositFunction(
      args.receiver,
      value,
      args.erc20,
      revertOptions,
      args.txOptions
    );
  } else {
    const depositAbiSignature =
      "deposit(address,(address,bool,address,bytes,uint256))";
    const gatewayDepositFunction = gateway[
      depositAbiSignature
    ] as GatewayContract["deposit"];
    const value = ethers.parseEther(args.amount);

    tx = await gatewayDepositFunction(args.receiver, revertOptions, {
      ...args.txOptions,
      value,
    });
  }

  return tx;
};
