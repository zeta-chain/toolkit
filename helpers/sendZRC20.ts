import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { getEndpoints } from "@zetachain/networks";
import { networks } from "@zetachain/networks";
import { getAddress } from "@zetachain/protocol-contracts";
import ZRC20 from "@zetachain/protocol-contracts/abi/zevm/ZRC20.sol/ZRC20.json";
import { ethers } from "ethers";
import fetch from "isomorphic-fetch";

export const sendZRC20 = async (
  signer: any,
  amount: string,
  network: string,
  destination: string,
  recipient: string,
  token: string
) => {
  let value;
  try {
    value = ethers.utils.parseEther(amount);
  } catch (e) {
    throw new Error(
      `${value} is not a number and not a valid value for --amount, ${e}`
    );
  }

  const API = getEndpoints("cosmos-http", "zeta_testnet")?.[0]?.url;
  const response = await fetch(`${API}/zeta-chain/fungible/foreign_coins`);
  const data = await response.json();
  const foreignCoins = data.foreignCoins;
  const networkChainID = networks[network as keyof typeof networks]?.chain_id;
  const foreignCoinsFiltered = foreignCoins.filter((coin: any) => {
    return coin.foreign_chain_id === networkChainID.toString();
  });
  let tx;
  if (network === "zeta_testnet") {
    const ZRC20Address = getAddress("zrc20", destination as any);
    const contract = new ethers.Contract(ZRC20Address, ZRC20.abi, signer);
    const value = ethers.utils.parseUnits(amount, 8);
    await (await contract.connect(signer).approve(ZRC20Address, value)).wait();
    const to =
      destination === "btc_testnet"
        ? ethers.utils.toUtf8Bytes(recipient)
        : signer.address;
    return await contract.connect(signer).withdraw(to, value);
  } else if (destination === "zeta_testnet") {
    const TSSAddress = getAddress("tss", network as any);
    const zrc20 = foreignCoinsFiltered.find(
      (coin: any) => coin.symbol.toLowerCase() === token.toLowerCase()
    );
    if (zrc20.coin_type.toLocaleLowerCase() === "erc20") {
      if (zrc20 === undefined) {
        throw new Error(
          `Token ${token} is not one of the available tokens to be deposited from ${network} to zeta_testnet`
        );
      }
      const erc20ContractAddress = zrc20.asset;
      const erc20TokenContract = new ethers.Contract(
        erc20ContractAddress,
        ERC20_ABI.abi,
        signer
      );
      const balance = await erc20TokenContract.balanceOf(signer.address);
      if (balance.lt(value)) {
        throw new Error("Insufficient token balance.");
      }
      const approveTx = await erc20TokenContract.approve(TSSAddress, value);
      await approveTx.wait();
      tx = await erc20TokenContract.transfer(TSSAddress, value);
    } else if (zrc20.coin_type.toLocaleLowerCase() === "gas") {
      tx = await signer.sendTransaction({
        to: TSSAddress,
        value,
      });
    }
    return tx;
  } else {
    throw new Error("Either --network or --destination should be zeta_testnet");
  }
};
