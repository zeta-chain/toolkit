import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { networks } from "@zetachain/networks";
import { getChainId } from "@zetachain/networks";
import { getAddress } from "@zetachain/protocol-contracts";
import ZRC20 from "@zetachain/protocol-contracts/abi/zevm/ZRC20.sol/ZRC20.json";
import { ethers } from "ethers";

import { ZetaChainClient } from "./client";

const withdraw = async ({
  signer,
  amount,
  to,
  zrc20,
}: {
  amount: string;
  signer: any;
  to: any;
  zrc20: string;
}) => {
  const targetContract = new ethers.Contract(zrc20, ZRC20.abi, signer);
  const targetDecimals = await targetContract.decimals();

  const [gasAddress, gasFee] = await targetContract.withdrawGasFee();
  const gasContract = new ethers.Contract(gasAddress, ZRC20.abi, signer);

  const targetValue = ethers.utils.parseUnits(amount, targetDecimals);
  await (await gasContract.connect(signer).approve(gasAddress, gasFee)).wait();
  return await targetContract.connect(signer).withdraw(to, targetValue);
};

const deposit = async ({
  signer,
  amount,
  to,
  erc20,
  message,
}: {
  amount: string;
  erc20?: string;
  message?: string;
  signer: any;
  to: string;
}) => {
  const { chainId } = signer.provider.network;
  const chain = Object.entries(networks).find(
    (x) => x[1].chain_id === chainId
  )?.[0];
  const tss = getAddress("tss", chain as any);
  if (erc20) {
    const contract = new ethers.Contract(erc20, ERC20_ABI.abi, signer);
    const balance = await contract.balanceOf(signer.address);
    if (balance.lt(amount)) {
      throw new Error("Insufficient token balance.");
    }
    const decimals = await contract.decimals();
    const value = ethers.utils.parseUnits(amount, decimals);
    const approveTx = await contract.approve(tss, value);
    return await approveTx.wait();
  } else {
    return await signer.sendTransaction({
      data: `${to}${message ?? ""}`,
      to: tss,
      value: ethers.utils.parseUnits(amount, 18),
    });
  }
};

export const sendZRC20 = async function (
  this: ZetaChainClient,
  signer: any,
  amount: string,
  network: string,
  destination: string,
  recipient: string,
  token: string
) {
  let value;
  try {
    value = ethers.utils.parseEther(amount);
  } catch (e) {
    throw new Error(
      `${value} is not a number and not a valid value for --amount, ${e}`
    );
  }

  const foreignCoins = await this.getForeignCoins();
  const counterparty = destination === "zeta_testnet" ? network : destination;
  const chainId =
    destination === "btc_testnet" ? 18332 : getChainId(counterparty); // https://github.com/zeta-chain/networks/pull/34/
  const { zrc20_contract_address: zrc20, asset: erc20 } = foreignCoins.find(
    (c: any) =>
      parseInt(c.foreign_chain_id) === chainId &&
      c.symbol.toLocaleLowerCase() === token.toLocaleLowerCase()
  );
  if (network === "zeta_testnet") {
    const to =
      destination === "btc_testnet"
        ? ethers.utils.toUtf8Bytes(recipient)
        : recipient;
    return await withdraw({ amount, signer, to, zrc20 });
  } else if (destination === "zeta_testnet") {
    return await deposit({ amount, erc20, signer, to: recipient });
  } else {
    throw new Error("Either network or destination should be zeta_testnet");
  }
};
