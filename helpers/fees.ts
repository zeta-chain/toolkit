import { getEndpoints } from "@zetachain/networks";
import { getAddress } from "@zetachain/protocol-contracts";
import ZRC20 from "@zetachain/protocol-contracts/abi/zevm/ZRC20.sol/ZRC20.json";
import axios from "axios";
import { formatEther, parseEther } from "ethers/lib/utils";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export type FeeDetails = {
  gasFee: string;
  protocolFee: string;
  totalFee: string;
};

const GAS_LIMIT = 350000;

export const getFee = async (
  type: "ccm" | "zevm",
  network: string,
  hre: HardhatRuntimeEnvironment
) => {
  const { ethers } = hre as any;
  const { url } = hre.config.networks["zeta_testnet"] as any;
  const provider = new ethers.providers.JsonRpcProvider(url);

  const API = getEndpoints("cosmos-http", "zeta_testnet")[0]?.url;
  if (!API) {
    throw new Error("getEndpoints: API endpoint not found");
  }

  if (type === "zevm") {
    return fetchZEVMFees(network, provider, hre);
  } else if (type === "ccm") {
    return fetchCCMFees(network, hre);
  }
};

const formatTo18Decimals = (n: any) => parseFloat(formatEther(n)).toFixed(18);

export const fetchZEVMFees = async (
  network: string,
  provider: any,
  hre: HardhatRuntimeEnvironment
) => {
  const btcZRC20 = "0x65a45c57636f9BcCeD4fe193A602008578BcA90b"; // TODO: use getAddress("zrc20", "btc_testnet") when available
  const zrc20Address =
    network === "btc_testnet" ? btcZRC20 : getAddress("zrc20", network);
  if (!zrc20Address) return;

  const contract = new hre.ethers.Contract(zrc20Address, ZRC20.abi, provider);

  const gasFee = hre.ethers.BigNumber.from(
    (await contract.withdrawGasFee())[1]
  );
  const protocolFee = hre.ethers.BigNumber.from(
    await contract.PROTOCOL_FLAT_FEE()
  );

  return {
    /* eslint-disable */
    totalFee: formatTo18Decimals(gasFee),
    gasFee: formatTo18Decimals(gasFee.sub(protocolFee)),
    protocolFee: formatTo18Decimals(protocolFee),
    /* eslint-enable */
  } as FeeDetails;
};

export const fetchCCMFees = async (
  network: string,
  hre: HardhatRuntimeEnvironment
) => {
  const API = getEndpoints("cosmos-http", "zeta_testnet")[0]?.url;
  if (!API) {
    throw new Error("getEndpoints: API endpoint not found");
  }

  const url = `${API}/zeta-chain/crosschain/convertGasToZeta?chain=${network}&gasLimit=${GAS_LIMIT}`;
  const { data } = await axios.get(url);

  const gasFee = hre.ethers.BigNumber.from(data.outboundGasInZeta);
  const protocolFee = hre.ethers.BigNumber.from(data.protocolFeeInZeta);

  return {
    /* eslint-disable */
    totalFee: formatTo18Decimals(gasFee.add(protocolFee)),
    gasFee: formatTo18Decimals(gasFee),
    protocolFee: formatTo18Decimals(protocolFee),
    /* eslint-enable */
  } as FeeDetails;
};
