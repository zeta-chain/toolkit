import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import GatewayABI from "@zetachain/protocol-contracts/abi/GatewayEVM.sol/GatewayEVM.json";
import { AbiCoder, ethers } from "ethers";

import {
  ERC20Contract,
  GatewayContract,
  RevertOptions,
  TxOptions,
} from "../../../types/contracts.types";
import { ParseAbiValuesReturnType } from "../../../types/parseAbiValues.types";
import { toHexString } from "../../../utils/toHexString";
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
  const gateway = new ethers.Contract(
    gatewayEvmAddress,
    GatewayABI.abi,
    signer
  ) as GatewayContract;

  const revertOptions = {
    ...args.revertOptions,
    revertMessage: toHexString(args.revertOptions.revertMessage),
  };

  const abiCoder = AbiCoder.defaultAbiCoder();
  const encodedParameters = abiCoder.encode(args.types, args.values);

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

    const depositAndCallAbiSignature =
      "depositAndCall(address,uint256,address,bytes,(address,bool,address,bytes,uint256))";
    const gatewayDepositAndCallFunction = gateway[
      depositAndCallAbiSignature
    ] as GatewayContract["depositAndCall"];

    tx = await gatewayDepositAndCallFunction(
      args.receiver,
      value,
      args.erc20,
      encodedParameters,
      revertOptions,
      args.txOptions
    );
  } else {
    const depositAndCallAbiSignature =
      "depositAndCall(address,bytes,(address,bool,address,bytes,uint256))";
    const depositAndCallFunction = gateway[
      depositAndCallAbiSignature
    ] as GatewayContract["depositAndCall"];
    const value = ethers.parseEther(args.amount);

    tx = await depositAndCallFunction(
      args.receiver,
      encodedParameters,
      revertOptions,
      {
        ...args.txOptions,
        value,
      }
    );
  }

  return tx;
};
