import { task } from "hardhat/config";
import Gateway_IDL from "./solana/idl/gateway.json";
import * as anchor from "@coral-xyz/anchor";
import { ethers } from "ethers";
import path from "path";

const solanaLocalnetDepositAndCall = async (args: any) => {
  process.env.ANCHOR_WALLET = path.resolve(
    process.env.HOME || process.env.USERPROFILE || "",
    ".config/solana/id.json"
  );
  const gatewayProgram = new anchor.Program(Gateway_IDL as anchor.Idl);
  const message = Buffer.from(args.message);
  await gatewayProgram.methods
    .depositAndCall(
      new anchor.BN(args.amount),
      ethers.utils.arrayify(args.address),
      message
    )
    .accounts({})
    .rpc();
};

export const solanaLocalnetDepositAndCallTask = task(
  "solana-localnet-deposit-and-call",
  "Solana deposit and call",
  solanaLocalnetDepositAndCall
)
  .addParam("address", "Address to deposit and call")
  .addParam("message", "Message")
  .addParam("amount", "Amount of SOL to deposit");
