import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { ZetaChainClient } from "../../client/src";

export const solanaDeposit = async (
  args: any,
  hre: HardhatRuntimeEnvironment
) => {
  const { amount, memo, api, idPath } = args;
  const client = new ZetaChainClient({ network: "testnet" });
  await client.solanaDeposit({ amount, memo, api, idPath });
};

task("solana-deposit", "Solana deposit", solanaDeposit)
  .addParam("amount", "Amount of SOL to deposit")
  .addParam("memo", "Memo")
  .addOptionalParam("api", "Solana API", "https://api.devnet.solana.com")
  .addOptionalParam("idPath", "Path to id.json", "~/.config/solana/id.json");
