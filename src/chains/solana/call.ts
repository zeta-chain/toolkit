import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor";
import GATEWAY_DEV_IDL from "@zetachain/protocol-contracts-solana/dev/idl/gateway.json";
import GATEWAY_PROD_IDL from "@zetachain/protocol-contracts-solana/prod/idl/gateway.json";
import { ethers } from "ethers";

import { RevertOptions } from "../../../types/contracts.types";
import { ParseAbiValuesReturnType } from "../../../types/parseAbiValues.types";
import { getAPIbyChainId } from "../../../utils/solana.commands.helpers";

type solanaCallParams = {
  receiver: string;
  revertOptions: RevertOptions;
  types: string[];
  values: ParseAbiValuesReturnType;
};

type solanaOptions = {
  chainId: string;
  signer: anchor.web3.Keypair;
};

export const solanaCall = async (
  params: solanaCallParams,
  options: solanaOptions
) => {
  // Mainnet and devnet use the same IDL
  const gatewayIDL =
    options.chainId === "0901" ? GATEWAY_DEV_IDL : GATEWAY_PROD_IDL;

  const API = getAPIbyChainId(options.chainId);

  const connection = new anchor.web3.Connection(API);
  const provider = new anchor.AnchorProvider(
    connection,
    new Wallet(options.signer)
  );
  const gatewayProgram = new anchor.Program(gatewayIDL as anchor.Idl, provider);

  const receiverBytes = ethers.getBytes(params.receiver);
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encodedParameters = abiCoder.encode(params.types, params.values);
  const message = Buffer.from(encodedParameters.slice(2), "hex");

  const revertOptions = {
    abortAddress: ethers.getBytes(params.revertOptions.abortAddress!),
    callOnRevert: params.revertOptions.callOnRevert,
    onRevertGasLimit: new anchor.BN(params.revertOptions.onRevertGasLimit ?? 0),
    revertAddress: params.revertOptions.revertAddress
      ? new anchor.web3.PublicKey(params.revertOptions.revertAddress)
      : provider.wallet.publicKey,
    revertMessage: Buffer.from(params.revertOptions.revertMessage, "utf8"),
  };

  const tx = await gatewayProgram.methods
    .call(receiverBytes, message, revertOptions)
    .accounts({})
    .rpc();
  console.log("Transaction hash:", tx);
};
