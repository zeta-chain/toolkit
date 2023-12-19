import { getEndpoints } from "@zetachain/networks/dist/src/getEndpoints";
import networks from "@zetachain/networks/dist/src/networks";
import { getAddress } from "@zetachain/protocol-contracts";
import ZRC20 from "@zetachain/protocol-contracts/abi/zevm/ZRC20.sol/ZRC20.json";
import { ethers } from "ethers";
import { formatEther } from "ethers/lib/utils";
import fetch from "isomorphic-fetch";

const formatTo18Decimals = (n: any) => parseFloat(formatEther(n)).toFixed(18);

export const fetchZEVMFees = async (network: string) => {
  const url = getEndpoints("evm", "zeta_testnet")[0].url;

  const provider = new ethers.providers.StaticJsonRpcProvider(url);
  const btcZRC20 = "0x65a45c57636f9BcCeD4fe193A602008578BcA90b"; // TODO: use getAddress("zrc20", "btc_testnet") when available
  const zrc20Address =
    network === "btc_testnet" ? btcZRC20 : getAddress("zrc20", network as any);
  if (!zrc20Address) return;

  const contract = new ethers.Contract(zrc20Address, ZRC20.abi, provider);
  const [, withdrawGasFee] = await contract.withdrawGasFee();
  const gasFee = ethers.BigNumber.from(withdrawGasFee);

  const protocolFee = ethers.BigNumber.from(await contract.PROTOCOL_FLAT_FEE());
  return {
    /* eslint-disable */
    totalFee: formatTo18Decimals(gasFee),
    gasFee: formatTo18Decimals(gasFee.sub(protocolFee)),
    protocolFee: formatTo18Decimals(protocolFee),
    /* eslint-enable */
  };
};

export const fetchCCMFees = async (network: string, gas: Number = 500000) => {
  const API = getEndpoints("cosmos-http", "zeta_testnet")[0]?.url;
  if (!API) {
    throw new Error("getEndpoints: API endpoint not found");
  }

  const chainID = networks[network as keyof typeof networks]?.chain_id;

  const url = `${API}/zeta-chain/crosschain/convertGasToZeta?chainId=${chainID}&gasLimit=${gas}`;
  const response = await fetch(url);
  const data = await response.json();

  const gasFee = ethers.BigNumber.from(data.outboundGasInZeta);
  const protocolFee = ethers.BigNumber.from(data.protocolFeeInZeta);
  return {
    /* eslint-disable */
    totalFee: formatTo18Decimals(gasFee.add(protocolFee)),
    gasFee: formatTo18Decimals(gasFee),
    protocolFee: formatTo18Decimals(protocolFee),
    /* eslint-enable */
  };
};

export const fetchFees = async (gas: Number) => {
  let fees = {
    feesCCM: {} as Record<string, any>,
    feesZEVM: {} as Record<string, any>,
  };

  const networkList = [...Object.keys(networks), "btc_testnet"];

  await Promise.all(
    networkList.map(async (n) => {
      try {
        const zevmFees = await fetchZEVMFees(n);
        if (zevmFees) fees.feesZEVM[n] = zevmFees;
        const ccmFees = await fetchCCMFees(n, gas);
        if (ccmFees) fees.feesCCM[n] = ccmFees;
      } catch (err) {}
    })
  );
  return fees;
};
