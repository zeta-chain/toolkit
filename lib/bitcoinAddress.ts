import * as bitcoin from "bitcoinjs-lib";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";

export const bitcoinAddress = (pk: string) => {
  const TESTNET = bitcoin.networks.testnet;

  const ECPair = ECPairFactory(ecc);
  const key = ECPair.fromPrivateKey(Buffer.from(pk, "hex"), {
    network: TESTNET,
  });
  const { address } = bitcoin.payments.p2wpkh({
    network: TESTNET,
    pubkey: key.publicKey,
  });
  if (!address) throw new Error("Unable to generate bitcoin address");
  return address;
};
