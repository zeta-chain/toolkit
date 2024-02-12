import { getAddress, testnet, mainnet } from "@zetachain/protocol-contracts";
import ZRC20 from "@zetachain/protocol-contracts/abi/zevm/ZRC20.sol/ZRC20.json";
import { ethers, utils } from "ethers";
import fetch from "isomorphic-fetch";
import { ZetaChainClient } from "./client";

async function fetchZEVMFees(zrc20: any, rpc: any) {
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
}

async function fetchCCMFees(this: ZetaChainClient, chainID: any, gas: Number) {
  // Skip ZetaChain as we can't send messages from ZetaChain to ZetaChain
  if (chainID === "7000" || chainID === "7001") return;
  const API = this.getEndpoints("cosmos-http", `zeta_${this.network}`);
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
}

export async function getFees(this: ZetaChainClient, gas: Number) {
  let fees = {
    feesCCM: {} as Record<string, any>,
    feesZEVM: {} as Record<string, any>,
  };
  const supportedChains = await this.getSupportedChains();

  const addresses = this.network === "mainnet" ? mainnet : testnet;
  const zrc20Addresses = addresses.filter((a: any) => a.type === "zrc20");

  await Promise.all(
    supportedChains.map(async (n: any) => {
      try {
        const ccmFees = await fetchCCMFees.call(this, n.chain_id, gas);
        if (ccmFees) fees.feesCCM[n.chain_name] = ccmFees;
      } catch (err) {
        console.log(err);
      }
    })
  );
  await Promise.all(
    zrc20Addresses.map(async (zrc20: any) => {
      try {
        const rpc = this.getEndpoints("evm", `zeta_${this.network}`);
        fees.feesZEVM[zrc20.symbol.toLowerCase()] = await fetchZEVMFees(
          zrc20,
          rpc
        );
      } catch (err) {
        console.log(err);
      }
    })
  );
  return fees;
}
