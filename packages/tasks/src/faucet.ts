// @ts-expect-error @description Could not find a declaration file for drip module
import { drip } from "@zetachain/faucet-cli/dist/commands/drip";
import * as dotenv from "dotenv";
import { ethers, utils } from "ethers";
import { task } from "hardhat/config";
import { z } from "zod";

import { walletError } from "./balances";

dotenv.config();

const typedDripFunction = drip as (args: { address: string }) => Promise<void>;

const faucetError = `
* Alternatively, you can request tokens on any address
  by using the --address flag:
  
  npx hardhat faucet --address <wallet_address>
`;

const getRecipientAddress = (address: string) => {
  if (address) {
    return address;
  } else if (process.env.PRIVATE_KEY) {
    return new ethers.Wallet(process.env.PRIVATE_KEY).address;
  } else {
    throw new Error(walletError + faucetError);
  }
};

const evmAddressSchema = z
  .string()
  .refine((val) => utils.isAddress(val), "Must be a valid EVM address");

const faucetArgsSchema = z.object({
  address: evmAddressSchema,
});

type FaucetArgs = z.infer<typeof faucetArgsSchema>;

const main = async (args: FaucetArgs) => {
  const { data: parsedArgs, success, error } = faucetArgsSchema.safeParse(args);

  if (!success) {
    console.error("Invalid arguments:", error?.message);
    return;
  }

  try {
    const address = getRecipientAddress(parsedArgs.address);
    await typedDripFunction({ address });
  } catch (error) {
    console.error(error);
  }
};

export const faucetTask = task(
  "faucet",
  "Request ZETA tokens from the faucet on a specific chain.",
  main
).addOptionalParam(
  "address",
  "Recipient address. (default: address derived from PRIVATE_KEY env variable)"
);
