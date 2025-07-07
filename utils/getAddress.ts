import { mainnet, testnet } from "@zetachain/protocol-contracts";
import {
  ParamSymbol,
  ParamType,
} from "@zetachain/protocol-contracts/dist/lib/types";
import { ethers } from "ethers";

import { handleError } from "./handleError";

export const getAddress = (
  type: ParamType,
  chainId: number,
  symbol?: ParamSymbol
) => {
  const networks = [...testnet, ...mainnet];
  let address;
  if (type !== "zrc20" && symbol) {
    throw new Error("Symbol is only supported when ParamType is zrc20");
  }
  if (type === "zrc20") {
    address = networks.find((n) => {
      return (
        n.foreign_chain_id === chainId.toString() &&
        n.type === type &&
        (symbol ? n.symbol === symbol : n.coin_type === "gas")
      );
    });
  } else {
    address = networks.find((n) => {
      return n.chain_id === chainId && n.type === type;
    });
  }
  if (!address) {
    throw new Error("Address not found");
  }
  return address.address;
};

export const getGatewayAddressFromSigner = async (signer: ethers.Wallet) => {
  const provider = signer.provider;
  if (!provider) {
    throw new Error("Signer does not have a valid provider");
  }
  const network = await provider.getNetwork();
  const chainId = network.chainId;

  const gwAddress = getAddress("gateway", Number(chainId));

  if (!gwAddress) {
    throw new Error("Gateway address not found");
  }
  return gwAddress;
};

export const getGatewayAddressFromChainId = (
  gateway: string | undefined,
  chainId: string | undefined
) => {
  let gw;
  if (gateway) {
    gw = gateway;
  } else if (chainId) {
    gw = getAddress("gateway", parseInt(chainId));
  } else {
    handleError({
      context: "Failed to retrieve gateway address",
      error: new Error("Gateway address not found"),
      shouldThrow: true,
    });
    process.exit(1);
  }
  return gw;
};
