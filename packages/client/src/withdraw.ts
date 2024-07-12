import ZRC20 from "@zetachain/protocol-contracts/abi/zevm/ZRC20.sol/ZRC20.json";
import { ethers } from "ethers";

import { ZetaChainClient } from "./client";

/**
 * Initiates a withdraw transaction of a ZRC-20 token from ZetaChain to a
 * connected chain as a native gas or ERC-20 token.
 *
 * @param this - ZetaChainClient instance.
 * @param options - Withdrawal options.
 * @param options.amount - Amount to be withdrawn in human readable form.
 * @param options.zrc20 - ZRC-20 token contract address.
 * @param options.recipient - Recipient address for the withdrawal. If not provided,
 * the withdrawal is made to the signer's address.
 *
 * @returns A promise that resolves with the transaction details upon success.
 */
export const withdraw = async function (
  this: ZetaChainClient,
  {
    amount,
    zrc20,
    recipient,
  }: {
    amount: string;
    recipient: string;
    zrc20: string;
  }
) {
  let signer;
  if (this.signer) {
    signer = this.signer;
  } else if (this.wallet) {
    const chain = `zeta_${this.network}`;
    const rpc = this.getEndpoint("evm", chain);
    if (!rpc) throw new Error(`No EVM RPC endpoint found for ${chain} chain.`);
    const provider = new ethers.providers.JsonRpcProvider(rpc);
    signer = this.wallet.connect(provider);
  } else {
    throw new Error("No wallet or signer found.");
  }

  const targetContract = new ethers.Contract(zrc20, ZRC20.abi, signer);
  const targetDecimals = await targetContract.decimals();

  const [gasAddress, gasFee] = await targetContract.withdrawGasFee();
  const gasContract = new ethers.Contract(gasAddress, ZRC20.abi, signer);

  const value = ethers.utils.parseUnits(amount, targetDecimals);

  await (await gasContract.connect(signer).approve(zrc20, gasFee)).wait();

  const to = recipient;
  return await targetContract.connect(signer).withdraw(to, value);
};
