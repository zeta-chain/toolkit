import * as bitcoin from "bitcoinjs-lib";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";

/**
 * Generate a Bitcoin address from a private key
 *
 * @param pk - Private key in hex format
 * @param network - Bitcoin network ("mainnet" or "testnet")
 * @returns The generated Bitcoin address
 */
export const generateBitcoinAddress = (
  pk: string,
  network: "mainnet" | "testnet"
): string => {
  const bitcoinNetwork =
    network === "testnet" ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;

  const ECPair = ECPairFactory(ecc);
  const key = ECPair.fromPrivateKey(Buffer.from(pk, "hex"), {
    network: bitcoinNetwork,
  });
  const { address } = bitcoin.payments.p2wpkh({
    network: bitcoinNetwork,
    pubkey: key.publicKey,
  });
  if (!address) throw new Error("Unable to generate bitcoin address");
  return address;
};
