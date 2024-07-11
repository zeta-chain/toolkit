import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { getAddress, ParamChainName } from "@zetachain/protocol-contracts";
import ERC20Custody from "@zetachain/protocol-contracts/abi/evm/ERC20Custody.sol/ERC20Custody.json";
import { ethers } from "ethers";

import { ZetaChainClient } from "./client";
import { prepareParams } from "./prepareData";

/**
 * Initiates a deposit transaction of native gas or ERC-20 assets as ZRC-20 from
 * a connected chain to ZetaChain.
 *
 * @param this - ZetaChainClient instance.
 * @param options - Deposit options.
 * @param options.chain - Label of the connected chain from which the deposit is
 * made.
 * @param options.amount - Amount to be deposited in human readable form. For
 * example, 1.5 ETH is "1.5".
 * @param options.erc20 - If an ERC-20 token is being deposited, the address of
 * the ERC-20 token contract. If not provided, the deposit is assumed to be in
 * native gas token.
 * @param options.message - If a message is specified, ZetaChain will deposit
 * tokens into the `recipient` contract and call with with the message as an argument.
 * @param options.recipient - Recipient address for the deposit. If not provided,
 * the deposit is made to the signer's address.
 *
 * @returns A promise that resolves with the transaction details upon success.
 */
export const deposit = async function (
  this: ZetaChainClient,
  {
    chain,
    amount,
    recipient,
    erc20,
    message,
  }: {
    amount: string;
    chain: string;
    erc20?: string;
    message?: [string[], string[]];
    recipient: string;
  }
) {
  let signer;
  if (this.signer) {
    signer = this.signer;
  } else if (this.wallet) {
    const rpc = this.getEndpoint("evm", chain);
    if (!rpc) throw new Error(`No EVM RPC endpoint found for ${chain} chain.`);
    const provider = new ethers.providers.JsonRpcProvider(rpc);
    signer = this.wallet.connect(provider);
  } else {
    throw new Error("No wallet or signer found.");
  }
  if (message && !recipient) {
    throw new Error("Please, provide a valid contract address as recipient.");
  }

  const recipientHex = ethers.utils.hexZeroPad(recipient, 20);
  const encodedMessage = message
    ? ethers.utils.defaultAbiCoder.encode(message[0], message[1]).slice(2)
    : "";
  const data = recipientHex + encodedMessage;

  if (erc20) {
    const custody = getAddress(
      "erc20Custody",
      chain as ParamChainName
    ) as string;
    if (!custody) {
      throw new Error(`No ERC-20 custody contract found for ${chain} chain.`);
    }
    const custodyContract = new ethers.Contract(
      custody,
      ERC20Custody.abi,
      signer
    );
    const contract = new ethers.Contract(erc20, ERC20_ABI.abi, signer);
    const decimals = await contract.decimals();
    let value;
    try {
      value = ethers.utils.parseUnits(amount, decimals);
    } catch (e) {
      throw new Error("Amount cannot be parsed.");
    }
    const signerAddress = await signer.getAddress();
    const balance = await contract.balanceOf(signerAddress);
    if (balance.lt(value)) {
      throw new Error("Insufficient token balance.");
    }
    const approveTx = await contract.approve(custody, value);
    await approveTx.wait();
    return await custodyContract.deposit(recipient, erc20, value, data);
  } else {
    const tss = getAddress("tss", chain as ParamChainName);
    if (!tss) {
      throw new Error(`No TSS contract found for ${chain} chain.`);
    }
    const tx = {
      data,
      to: tss,
      value: ethers.utils.parseUnits(amount, 18),
    };
    return await signer.sendTransaction(tx);
  }
};
