import { ZetaChainClient } from "./client";
import { getAddress } from "@zetachain/protocol-contracts";
import { ethers } from "ethers";
import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import ERC20Custody from "@zetachain/protocol-contracts/abi/evm/ERC20Custody.sol/ERC20Custody.json";
import { prepareParams } from "./prepareData";
import ZRC20 from "@zetachain/protocol-contracts/abi/zevm/ZRC20.sol/ZRC20.json";

export const withdraw = async function (
  this: ZetaChainClient,
  {
    chain,
    amount,
    zrc20,
    recipient,
  }: {
    chain: "zeta_testnet" | "zeta_mainnet";
    amount: string;
    zrc20: string;
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
  const targetContract = new ethers.Contract(zrc20, ZRC20.abi, signer);
  const targetDecimals = await targetContract.decimals();

  const [gasAddress, gasFee] = await targetContract.withdrawGasFee();
  const gasContract = new ethers.Contract(gasAddress, ZRC20.abi, signer);

  const value = ethers.utils.parseUnits(amount, targetDecimals);
  await (await gasContract.connect(signer).approve(gasAddress, gasFee)).wait();

  const to = recipient ? recipient : signer.address;
  return await targetContract.connect(signer).withdraw(to, value);
};
