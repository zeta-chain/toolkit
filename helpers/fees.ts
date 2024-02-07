import { getAddress, testnet, mainnet } from "@zetachain/protocol-contracts";
import ZRC20 from "@zetachain/protocol-contracts/abi/zevm/ZRC20.sol/ZRC20.json";
import { ethers, utils } from "ethers";
import fetch from "isomorphic-fetch";
import { getEndpoints } from "../utils/getEndpoints";
import { getSupportedChains } from "../utils/getSupportedChains";

export const fetchZEVMFees = async (zrc20: any, rpc: any) => {
  const provider = new ethers.providers.StaticJsonRpcProvider(rpc);
  const contract = new ethers.Contract(zrc20.address, ZRC20.abi, provider);
  const [, withdrawGasFee] = await contract.withdrawGasFee();
  const gasFee = ethers.BigNumber.from(withdrawGasFee);

  const protocolFee = ethers.BigNumber.from(await contract.PROTOCOL_FLAT_FEE());
  return {
    /* eslint-disable */
    totalFee: utils.formatUnits(gasFee, 18),
    gasFee: utils.formatUnits(gasFee.sub(protocolFee), 18),
    protocolFee: utils.formatUnits(protocolFee, 18),
    /* eslint-enable */
  };
};

export const fetchCCMFees = async (
  chains: any,
  network: string,
  chainID: any,
  gas: Number = 500000
) => {
  // Skip ZetaChain as we can't send messages from ZetaChain to ZetaChain
  if (chainID === "7000" || chainID === "7001") return;
  const API = getEndpoints(chains, "cosmos-http", `zeta_${network}`)[0]?.url;
  if (!API) {
    throw new Error("getEndpoints: API endpoint not found");
  }
  const url = `${API}/zeta-chain/crosschain/convertGasToZeta?chainId=${chainID}&gasLimit=${gas}`;
  const response = await fetch(url);
  const data = await response.json();
  const gasFee = ethers.BigNumber.from(data.outboundGasInZeta);
  const protocolFee = ethers.BigNumber.from(data.protocolFeeInZeta);
  return {
    /* eslint-disable */
    totalFee: utils.formatUnits(gasFee.add(protocolFee), 18),
    gasFee: utils.formatUnits(gasFee, 18),
    protocolFee: utils.formatUnits(protocolFee, 18),
    /* eslint-enable */
  };
};

export const getFees = async (chains: any, network: any, gas: Number) => {
  let fees = {
    feesCCM: {} as Record<string, any>,
    feesZEVM: {} as Record<string, any>,
  };
  const zetaCosmosHTTP = getEndpoints(
    chains,
    "cosmos-http",
    `zeta_${network}`
  )[0]?.url;
  const supportedChains = await getSupportedChains(zetaCosmosHTTP);

  const addresses = network === "mainnet" ? mainnet : testnet;
  const zrc20Addresses = addresses.filter((a: any) => a.type === "zrc20");

  await Promise.all(
    supportedChains.map(async (n: any) => {
      try {
        const ccmFees = await fetchCCMFees(chains, network, n.chain_id, gas);
        if (ccmFees) fees.feesCCM[n.chain_name] = ccmFees;
      } catch (err) {
        console.log(err);
      }
    })
  );
  await Promise.all(
    zrc20Addresses.map(async (zrc20: any) => {
      try {
        const rpc = getEndpoints(chains, "evm", `zeta_${network}`)[0].url;
        fees.feesZEVM[zrc20.symbol] = await fetchZEVMFees(zrc20, rpc);
      } catch (err) {
        console.log(err);
      }
    })
  );
  return fees;
};
