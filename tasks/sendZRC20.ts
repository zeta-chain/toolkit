import confirm from "@inquirer/confirm";
import { getChainId } from "@zetachain/networks";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ZetaChainClient } from "../helpers/client";

declare const hre: any;

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const client = new ZetaChainClient({ network: "testnet" });
  const { ethers } = hre as any;
  const [signer] = await ethers.getSigners();

  const { amount, destination, token } = args;
  const from = hre.network.name;
  const recipient = args.recipient || signer.address;
  const foreign_coins = await client.getForeignCoins();
  const symbol = foreign_coins.find(
    (c: any) =>
      c.coin_type === "Gas" &&
      c.foreign_chain_id === getChainId(destination)?.toString()
  )?.symbol;

  let fee = 0;
  if (args.destination !== "zeta_testnet") {
    const fees = await client.getFees(5000000);
    console.log("fees", fees);
    fee = fees.feesZEVM[args.token].totalFee;
  }

  console.log(`
Networks:        ${from} → ${destination}
Amount sent:     ${amount} ${token.toUpperCase()}
Cross-chain fee: ${fee} ${symbol?.toUpperCase()}
From address:    ${signer.address}
To address:      ${recipient}
`);

  await confirm(
    {
      message: `Please, confirm the transaction`,
    },
    { clearPromptOnDone: true }
  );

  const tx = (await client.sendZRC20(
    signer,
    args.amount,
    from,
    destination,
    recipient,
    token
  )) as any;
  console.log(`Transaction successfully broadcasted!
Hash: ${tx.hash}`);
};

export const sendZRC20Task = task(
  "send-zrc20",
  "Send ZRC-20 tokens to and from ZetaChain",
  main
)
  .addParam("amount", "Amount of ZRC-20 to send")
  .addParam("destination", "Destination chain")
  .addOptionalParam("recipient", "Recipient address")
  .addParam("token", "Token to send (geth, usdc, etc)");
