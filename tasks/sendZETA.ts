import confirm from "@inquirer/confirm";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ZetaChainClient } from "../helpers/client";

declare const hre: any;

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const client = new ZetaChainClient({ network: "testnet" });
  const [signer] = await hre.ethers.getSigners();

  const fees = await client.getFees(5000000);
  const fee = fees.feesCCM[args.destination].totalFee;
  if (parseFloat(args.amount) < parseFloat(fee))
    throw new Error(
      `Amount must be greater than ${fee} ZETA to cover the cross-chain fees`
    );

  const { amount, destination } = args;
  const recipient = args.recipient || signer.address;
  const from = hre.network.name;

  if (args.json) {
    const tx = await client.sendZETA(
      signer,
      amount,
      from,
      destination,
      recipient
    );
    console.log(JSON.stringify(tx, null, 2));
  } else {
    console.log(`
Networks:        ${from} → ${destination}
Amount sent:     ${amount} ZETA
Cross-chain fee: ${fee} ZETA
Amount received: ${(parseFloat(amount) - parseFloat(fee)).toFixed(
      18
    )} ZETA (estimated)
From address:    ${signer.address}
To address:      ${recipient}
`);

    await confirm(
      {
        message: `Please, confirm the transaction`,
      },
      { clearPromptOnDone: true }
    );
    const tx = await client.sendZETA(
      signer,
      amount,
      from,
      destination,
      recipient
    );
    console.log(`Transaction successfully broadcasted!
Hash: ${tx.hash}`);
  }
};

export const sendZETATask = task(
  "send-zeta",
  "Send ZETA tokens between connected chains",
  main
)
  .addParam("amount", "Amount of ZETA to send")
  .addParam("destination", "Destination chain")
  .addOptionalParam("recipient", "Recipient address")
  .addFlag("json", "Output JSON");
