import confirm from "@inquirer/confirm";
import { utils } from "ethers";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { z } from "zod";

import { ZetaChainClient } from "../../client/src/";

const sendZetaTaskArgsSchema = z.object({
  amount: z.string().refine((val) => !isNaN(Number(val)), {
    message: "Amount must be a valid number",
  }),
  destination: z.string().min(1, "Destination chain must not be empty"),
  gasLimit: z
    .string()
    .refine((val) => !isNaN(Number(val)))
    .optional(),
  ignoreChecks: z.boolean().optional(),
  json: z.boolean().optional(),
  recipient: z
    .string()
    .refine((val) => utils.isAddress(val), {
      message: "Recipient address must be a valid EVM address",
    })
    .optional(),
});

type SendZetaTaskArgs = z.infer<typeof sendZetaTaskArgsSchema>;

const main = async (args: SendZetaTaskArgs, hre: HardhatRuntimeEnvironment) => {
  const {
    success: argsParseSuccess,
    error: argsParseError,
    data: parsedArgs,
  } = sendZetaTaskArgsSchema.safeParse(args);

  if (!argsParseSuccess) {
    throw new Error(`❌ Invalid arguments: ${argsParseError.message}`);
  }

  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    throw new Error(
      "signer not found. Please, set the PRIVATE_KEY env variable."
    );
  }

  const client = new ZetaChainClient({ network: "testnet", signer });

  const isDestinationZeta = ["zeta_testnet", "zeta_mainnet"].includes(
    parsedArgs.destination
  );
  let fee = "0";

  if (!isDestinationZeta) {
    const fees = await client.getFees(5000000);
    const chainID = client.chains[parsedArgs.destination].chain_id;
    const chainFee = fees.messaging.find((f) => f.chainID == String(chainID));

    if (!chainFee) {
      throw new Error(`Cannot fetch fees for chain ID ${chainID}`);
    }

    fee = chainFee.totalFee;

    if (
      parseFloat(parsedArgs.amount) < parseFloat(fee) &&
      !parsedArgs.ignoreChecks
    ) {
      throw new Error(
        `Amount must be greater than ${fee} ZETA to cover the cross-chain fees`
      );
    }
  }

  const { amount, destination } = parsedArgs;
  const signerAddress = await signer.getAddress();
  const recipient = parsedArgs.recipient || signerAddress;
  const chain = hre.network.name;

  const data = {
    amount,
    chain,
    destination,
    gasLimit: 0,
    recipient,
  };

  if (parsedArgs.gasLimit) data.gasLimit = Number(parsedArgs.gasLimit);

  if (parsedArgs.json) {
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
