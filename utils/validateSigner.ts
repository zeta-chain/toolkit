import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "ethers";

export const validateSigner = (
  signer: ethers.Signer | SignerWithAddress | undefined
): ethers.Signer => {
  if (!signer) {
    throw new Error("Signer is undefined. Please provide a valid signer.");
  }

  if (!("provider" in signer)) {
    throw new Error("Signer does not have a valid provider");
  }

  if (!signer.provider) {
    throw new Error("Signer does not have a valid provider");
  }

  return signer;
};

export const isValidEthersSigner = (val: unknown): val is ethers.Signer => {
  try {
    validateSigner(val as ethers.Signer | SignerWithAddress | undefined);
    return true;
  } catch {
    return false;
  }
};
