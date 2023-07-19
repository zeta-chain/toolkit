import { drip } from "@zetachain/faucet-cli/dist/commands/drip";
import * as dotenv from "dotenv";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { walletError } from "./balances";

dotenv.config();

const faucetError = `
* Alternatively, you can request tokens on any address
  by using the --address flag:
  
  npx hardhat faucet --address <wallet_address>
`;

const getRecipientAddress = (args: any, hre: HardhatRuntimeEnvironment) => {
  const { ethers } = hre as any;
  if (args.address) {
    return args.address;
  } else if (process.env.PRIVATE_KEY) {
    return new ethers.Wallet(process.env.PRIVATE_KEY).address;
  } else {
    console.error(walletError + faucetError);
    throw new Error();
  }
};

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  try {
    const address = getRecipientAddress(args, hre);
    await drip({ address, chain: args.chain }, []);
  } catch (error) {
    console.error(error);
  }
};

export const faucetTask = task(
  "faucet",
  "Request ZETA tokens from the faucet on a specific chain.",
  main
)
  .addOptionalParam(
    "address",
    "Recipient address. (default: address derived from PRIVATE_KEY env variable)"
  )
  .addParam(
    "chain",
    `Blockchain network where tokens will be sent.`,
    "zeta_testnet"
  );
