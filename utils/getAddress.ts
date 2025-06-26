import MAINNET from "@zetachain/protocol-contracts/dist/data/addresses.mainnet.json";
import TESTNET from "@zetachain/protocol-contracts/dist/data/addresses.testnet.json";
import {
  ParamSymbol,
  ParamType,
} from "@zetachain/protocol-contracts/dist/lib/types";
import { ethers } from "ethers";

export const getAddress = (
  type: ParamType,
  chainId: number,
  symbol?: ParamSymbol
) => {
  const networks = [...TESTNET, ...MAINNET];
  let address;
  if (type !== "zrc20" && symbol) {
    throw new Error("Symbol is only supported when ParamType is zrc20");
  }
  if (type === "zrc20" && !symbol) {
    address = networks.find((n) => {
      return (
        n.foreign_chain_id === chainId.toString() &&
        n.type === type &&
        n.coin_type === "gas"
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

export const getGatewayAddress = async (signer: ethers.Wallet) => {
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
