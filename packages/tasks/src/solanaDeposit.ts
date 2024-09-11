import bech32 from "bech32";
import { utils } from "ethers";
import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

import { ZetaChainClient } from "../../client/src";

export const solanaDeposit = async (
  args: any,
  hre: HardhatRuntimeEnvironment
) => {
  const client = new ZetaChainClient({ network: "testnet" });
  let recipient;
  try {
    if ((bech32 as any).decode(args.recipient)) {
      recipient = utils.solidityPack(
        ["bytes"],
        [utils.toUtf8Bytes(args.recipient)]
      );
    }
  } catch (e) {
    recipient = args.recipient;
  }
  const { amount, api, idPath } = args;
  const params = [JSON.parse(args.types), args.values];
  await client.solanaDeposit({ amount, api, idPath, params, recipient });
};

task("solana-deposit", "Solana deposit", solanaDeposit)
  .addParam("amount", "Amount of SOL to deposit")
  .addParam("recipient", "Universal contract address")
  .addOptionalParam("api", "Solana API", "https://api.devnet.solana.com")
  .addOptionalParam("idPath", "Path to id.json", "~/.config/solana/id.json")
  .addParam("types", "The types of the parameters (example: ['string'])")
  .addVariadicPositionalParam("values", "The values of the parameters");
