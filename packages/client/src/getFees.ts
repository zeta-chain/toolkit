import { mainnet, testnet } from "@zetachain/protocol-contracts";
import ZRC20 from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import { ethers, utils } from "ethers";

import { ZRC20Contract } from "../../../types/contracts.types";
import { ForeignCoin } from "../../../types/foreignCoins.types";
import { FeeItem } from "../../../types/getFees.types";
import { ZetaChainClient } from "./client";

const fetchZEVMFees = async (
  zrc20: (typeof mainnet)[number],
  rpcUrl: string,
  foreignCoins: ForeignCoin[]
): Promise<FeeItem | undefined> => {
  const provider = new ethers.providers.StaticJsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(
    zrc20.address,
    ZRC20.abi,
    provider
  ) as ZRC20Contract;
  let withdrawGasFee;

  try {
    [, withdrawGasFee] = await contract.withdrawGasFee();
  } catch {
    return;
  }

  const gasFee = ethers.BigNumber.from(withdrawGasFee);
  const rawProtocolFlatFee = await contract.PROTOCOL_FLAT_FEE();
  const protocolFee = ethers.BigNumber.from(rawProtocolFlatFee);
  const gasToken = foreignCoins.find((foreignCoin) => {
    return (
      foreignCoin.foreign_chain_id === zrc20.foreign_chain_id &&
      foreignCoin.coin_type === "Gas"
    );
  });

  if (!gasToken) {
    return;
  }

  const result = {
    ...zrc20,
    chain_id: String(zrc20.chain_id),
    gasFee: utils.formatUnits(gasFee.sub(protocolFee), gasToken.decimals),
    protocolFee: utils.formatUnits(protocolFee, gasToken.decimals),
    totalFee: utils.formatUnits(gasFee, gasToken.decimals),
  } as FeeItem;

  return result;
};

type Fees = {
  omnichain: Array<FeeItem>;
};

export const getFees = async function (this: ZetaChainClient) {
  const fees: Fees = {
    omnichain: [],
  };

  const foreignCoins = await this.getForeignCoins();

  const addresses = this.network === "mainnet" ? mainnet : testnet;
  const zrc20Addresses = addresses.filter((a) => a.type === "zrc20");

  await Promise.all(
    zrc20Addresses.map(async (zrc20) => {
      try {
        const rpcUrl = this.getEndpoint("evm", `zeta_${this.network}`);
        const fee = await fetchZEVMFees(zrc20, rpcUrl, foreignCoins);
        if (fee) fees.omnichain.push(fee);
      } catch (err) {
        console.log(err);
      }
    })
  );

  return fees;
};
