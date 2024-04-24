import confirm from "@inquirer/confirm";
import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ZetaChainClient } from "../../client/src";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const { ethers } = hre as any;
  const [signer] = await ethers.getSigners();

  const client = new ZetaChainClient({ network: "testnet", signer });

  const { amount, erc20 } = args;

  let message;
  if (args.message) {
    try {
      const msg = JSON.parse(args.message);
      if (
        Array.isArray(msg) &&
        msg.length === 2 &&
        Array.isArray(msg[0]) &&
        msg[0].every((item: string) => typeof item === "string") &&
        msg[1].every((item: string) => typeof item === "string")
      ) {
        message = JSON.parse(args.message);
      } else {
        throw new Error(`must be an array like '[["string"], ["hello"]]'`);
      }
    } catch (e) {
      throw new Error(`invalid message, ${e}`);
    }
  }

  const chain = hre.network.name;
  if (chain === "zeta_testnet" || chain === "zeta_mainnet") {
    throw new Error(
      "the --network defines the chain from which the deposit will be made. The --network value cannot be zeta_testnet or zeta_mainnet"
    );
  }

  if (args.recipient) {
    if (!ethers.utils.isAddress(args.recipient)) {
      throw new Error("--recipient must be a valid address");
    }
  }

  if (message) {
    const rpc = client.getEndpoint("evm", "zeta_testnet");
    const provider = new ethers.providers.StaticJsonRpcProvider(rpc);
    const code = await provider.getCode(args.recipient);
    if (code === "0x") {
      throw new Error(
        "seems like --recipient is an EOA and not a contract on ZetaChain. At the same time the --message is not empty, which indicates this is a 'deposit and call' operation. Please, provide a valid omnichain contract address as the --recipient value"
      );
    }
  }

  const data = { amount, chain, erc20, message, recipient: args.recipient };

  let symbol;
  if (erc20) {
    try {
      const contract = new ethers.Contract(erc20, ERC20_ABI.abi, signer);
      symbol = await contract.symbol();
    } catch (e) {
      throw new Error("invalid ERC-20 address");
    }
  } else {
    const coins = await client.getForeignCoins();
    const chainId = client.getChainId(chain)?.toString();
    symbol = coins.find(
      (c: any) => c.coin_type === "Gas" && c.foreign_chain_id === chainId
    )?.symbol;
  }

  if (args.json) {
    const tx = await client.deposit(data);
    console.log(JSON.stringify(tx, null, 2));
  } else {
    console.log(`
Networks:    ${chain} → zeta_testnet
Amount sent: ${amount} ${symbol || ""}
Sender:      ${signer.address}
Recipient:   ${args.recipient || signer.address}`);
    if (message) {
      console.log(`Message:     ${args.message}`);
    }
    try {
      await confirm(
        {
          message: `Please, confirm the transaction`,
        },
        { clearPromptOnDone: true }
      );
    } catch (e) {
      console.log("Transaction cancelled");
    }
    const tx = await client.deposit(data);
    console.log(`Transaction successfully broadcasted!
Hash: ${tx.hash}`);
  }
};

export const depositTask = task(
  "deposit",
  "Deposit native gas or ERC-20 assets to ZetaChain as ZRC-20.",
  main
)
  .addParam("amount", "Amount tokens to send")
  .addOptionalParam("recipient", "Recipient address")
  .addOptionalParam("erc20", "ERC-20 token address")
  .addOptionalParam("message", `Message, like '[["string"], ["hello"]]'`)
  .addFlag("json", "Output in JSON");
