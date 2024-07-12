import confirm from "@inquirer/confirm";
import { task } from "hardhat/config";

import { ZetaChainClient } from "../../client/src/";

const main = async (args: any, hre: any) => {
  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    throw new Error(
      "signer not found. Please, set the PRIVATE_KEY env variable."
    );
  }

  const client = new ZetaChainClient({ network: "testnet", signer });

  const isDestinationZeta = ["zeta_testnet", "zeta_mainnet"].includes(
    args.destination
  );
  let fee = "0";

  if (!isDestinationZeta) {
    const fees = await client.getFees(5000000);
    const chainID = client.chains[args.destination].chain_id;
    const chainFee = fees.messaging.find((f: any) => f.chainID == chainID);
    if (!chainFee) {
      throw new Error(`Cannot fetch fees for chain ID ${chainID}`);
    }
    fee = chainFee.totalFee;
    if (parseFloat(args.amount) < parseFloat(fee) && !args.ignoreChecks) {
      throw new Error(
        `Amount must be greater than ${fee} ZETA to cover the cross-chain fees`
      );
    }
  }

  const { amount, destination } = args;
  const signerAddress = await signer.getAddress();
  const recipient = args.recipient || signerAddress;
  const chain = hre.network.name;

  const data: any = {
    amount,
    chain,
    destination,
    recipient,
  };

  if (args.gasLimit) data.gasLimit = args.gasLimit;

  if (args.json) {
    const tx = await client.sendZeta(data);
    console.log(JSON.stringify(tx, null, 2));
  } else {
    console.log(`
Networks:        ${chain} → ${destination}
Amount sent:     ${amount} ZETA
Cross-chain fee: ${fee} ZETA
Amount received: ${(parseFloat(amount) - parseFloat(fee)).toFixed(
      18
    )} ZETA (estimated)
From address:    ${signerAddress}
To address:      ${recipient}
`);

    await confirm(
      {
        message: `Please, confirm the transaction`,
      },
      { clearPromptOnDone: true }
    );
    const tx = await client.sendZeta(data);
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
  .addFlag("json", "Output JSON")
  .addOptionalParam("gasLimit", "Gas limit")
  .addFlag("ignoreChecks", "Ignore fee check");
