import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "ethers";

export const validateSigner = (
  signer: ethers.Signer | SignerWithAddress | undefined
): ethers.Signer => {
  if (!signer) {
    throw new Error("Signer is undefined. Please provide a valid signer.");
  }

  if (signer && !("provider" in signer)) {
    throw new Error("Signer does not have a valid provider");
  }

  return signer;
};
