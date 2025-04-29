import { mainnet, testnet } from "@zetachain/protocol-contracts";
import ZRC20 from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import axios from "axios";
import { BigNumberish, ethers } from "ethers";

import { ZRC20Contract } from "../../../types/contracts.types";
import { ForeignCoin } from "../../../types/foreignCoins.types";
import {
  ConvertGasToZetaResponse,
  FeeItem,
} from "../../../types/getFees.types";
import { handleError } from "../../../utils/handleError";
import { ZetaChainClient } from "./client";

const fetchZEVMFees = async (
  zrc20: (typeof mainnet)[number],
  rpcUrl: string,
  foreignCoins: ForeignCoin[]
): Promise<FeeItem | undefined> => {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(
    zrc20.address,
    ZRC20.abi,
    provider
  ) as ZRC20Contract;
  let withdrawGasFee: BigNumberish;
  try {
    [, withdrawGasFee] = await contract.withdrawGasFee();
  } catch (error: unknown) {
    handleError({
      context: "Something went wrong fetching withdraw gas fee",
      error,
    });

    return;
  }

  const gasFee = ethers.toBigInt(withdrawGasFee);
  const rawProtocolFlatFee = await contract.PROTOCOL_FLAT_FEE();
  const protocolFee = ethers.toBigInt(rawProtocolFlatFee);
  const gasToken = foreignCoins.find((foreignCoin) => {
    return (
      foreignCoin.foreign_chain_id === zrc20.foreign_chain_id &&
      foreignCoin.coin_type === "Gas"
    );
  });

  if (!gasToken) {
    console.error("Gas token not found");
    return;
  }

  const result = {
    ...zrc20,
    chain_id: String(zrc20.chain_id),
    gasFee: ethers.formatUnits(gasFee - protocolFee, gasToken.decimals),
    protocolFee: ethers.formatUnits(protocolFee, gasToken.decimals),
    totalFee: ethers.formatUnits(gasFee, gasToken.decimals),
  } as FeeItem;

  return result;
};

const fetchCCMFees = async function (
  this: ZetaChainClient,
  chainID: string,
  gas: number
) {
  // Skip ZetaChain and Bitcoin
  if (["7000", "7001", "18332", "8332"].includes(chainID)) return;

  const API = this.getEndpoint("cosmos-http", `zeta_${this.network}`);

  if (!API) {
    throw new Error("API endpoint not found");
  }

  try {
    const url = `${API}/zeta-chain/crosschain/convertGasToZeta?chainId=${chainID}&gasLimit=${gas}`;
    const response = await axios.get<ConvertGasToZetaResponse>(url);
    const isResponseOk = response.status >= 200 && response.status < 300;

    if (!isResponseOk) {
      throw new Error(`Could not fetch CCM fees for chain id: ${chainID}`);
    }

    const data = response.data;
    const gasFee = ethers.toBigInt(data.outboundGasInZeta);
    const protocolFee = ethers.toBigInt(data.protocolFeeInZeta);

    return {
      chainID,
      gasFee: ethers.formatUnits(gasFee, 18),
      protocolFee: ethers.formatUnits(protocolFee, 18),
      totalFee: ethers.formatUnits(gasFee + protocolFee, 18),
    };
  } catch (error: unknown) {
    handleError({
      context: "Something failed fetching CCTX By Inbound hash",
      error,
    });
  }
};

type Fees = {
  messaging: Array<{ [key: string]: string }>;
  omnichain: Array<FeeItem>;
};

export const getFees = async function (this: ZetaChainClient, gas: number) {
  const fees: Fees = {
    messaging: [],
    omnichain: [],
  };
  const supportedChains = await this.getSupportedChains();
  const foreignCoins = await this.getForeignCoins();

  const addresses = this.network === "mainnet" ? mainnet : testnet;
  const zrc20Addresses = addresses.filter((a) => a.type === "zrc20");

  await Promise.all(
    supportedChains.map(async (n: { chain_id: string; chain_name: string }) => {
      try {
        const fee = await fetchCCMFees.call(this, n.chain_id, gas);
        if (fee) fees.messaging.push(fee);
      } catch (error: unknown) {
        handleError({
          context: "Something went wrong fetching CCM fees",
          error,
        });
      }
    })
  );

  await Promise.all(
    zrc20Addresses.map(async (zrc20) => {
      try {
        const rpcUrl = this.getEndpoint("evm", `zeta_${this.network}`);
        const fee = await fetchZEVMFees(zrc20, rpcUrl, foreignCoins);
        if (fee) fees.omnichain.push(fee);
      } catch (error: unknown) {
        handleError({
          context: "Something went wrong fetching ZEVM fees",
          error,
        });
      }
    })
  );

  return fees;
};
