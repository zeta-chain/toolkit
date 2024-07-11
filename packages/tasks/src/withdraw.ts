import confirm from "@inquirer/confirm";
import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ZetaChainClient } from "../../client/src";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const { ethers } = hre as any;
  const [signer] = await ethers.getSigners();
  if (!signer) {
    throw new Error(
      "signer not found. Please, set the PRIVATE_KEY env variable."
    );
  }

  const client = new ZetaChainClient({ network: "testnet", signer });

  const signerAddress = await signer.getAddress();

  const recipient = args.recipient || signerAddress;
  const amount = args.amount;
  const zrc20 = args.zrc20;

  await confirm(
    {
      message: `Please, confirm the transaction`,
    },
    { clearPromptOnDone: true }
  );
  const tx = await client.withdraw({
    amount,
    recipient,
    zrc20,
  });
  console.log(`Transaction successfully broadcasted!
Hash: ${tx.hash}`);
};

export const withdrawTask = task(
  "withdraw",
  "Withdraw ZRC-20 from ZetaChain to a connected chain as native asset or ERC-20.",
  main
)
  .addParam("amount", "Amount of ZRC-20 to withdraw")
  .addParam("zrc20", "ZRC-20 token address")
  .addOptionalParam("recipient", "Recipient address");
