import { ZetaChainClient } from "./client";
import { getAddress } from "@zetachain/protocol-contracts";
import { ethers } from "ethers";
import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import ERC20Custody from "@zetachain/protocol-contracts/abi/evm/ERC20Custody.sol/ERC20Custody.json";
import { prepareParams } from "./prepareData";

export const deposit = async function (
  this: ZetaChainClient,
  {
    chain,
    amount,
    asset,
    message,
    recipient,
  }: {
    chain: string;
    amount: string;
    asset?: string;
    message?: [string[], string[]];
    recipient?: string;
  }
) {
  let signer;
  if (this.signer) {
    signer = this.signer;
  } else if (this.wallet) {
    const rpc = this.getEndpoints("evm", chain);
    if (!rpc) throw new Error(`No EVM RPC endpoint found for ${chain} chain.`);
    const provider = new ethers.providers.JsonRpcProvider(rpc);
    signer = this.wallet.connect(provider);
  } else {
    throw new Error("No wallet or signer found.");
  }
  if (asset) {
    const custody = getAddress("erc20Custody", chain as any) as string;
    if (!custody) {
      throw new Error(`No ERC-20 custody contract found for ${chain} chain.`);
    }
    const custodyContract = new ethers.Contract(
      custody,
      ERC20Custody.abi,
      signer
    );
    const contract = new ethers.Contract(asset, ERC20_ABI.abi, signer);
    const decimals = await contract.decimals();
    let value;
    try {
      value = ethers.utils.parseUnits(amount, decimals);
    } catch (e) {
      throw new Error("Amount cannot be parsed.");
    }
    const balance = await contract.balanceOf(signer.address);
    if (balance.lt(amount)) {
      throw new Error("Insufficient token balance.");
    }
    const approveTx = await contract.approve(custody, value);
    await approveTx.wait();
    const to = recipient ? recipient : signer.address;
    const data = message
      ? prepareParams(message[0], message[1])
      : ethers.utils.hexlify([]);
    return await custodyContract.deposit(to, asset, value, data);
  } else {
    const tss = getAddress("tss", chain as any);
    if (!tss) {
      throw new Error(`No TSS contract found for ${chain} chain.`);
    }
    if (recipient) {
      const tx: any = {
        to: tss,
        value: ethers.utils.parseUnits(amount, 18),
      };
      if (recipient) tx.data = `${recipient}${message ?? ""}`;
      return await signer.sendTransaction(tx);
    }
  }
};
