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

  const { amount, erc20 } = args;

  let inputToken = args.erc20
    ? await client.getZRC20FromERC20(erc20)
    : await client.getZRC20GasToken(hre.network.name);

  const refundFee = await client.getRefundFee(inputToken);
  const refundFeeAmount = ethers.utils.formatUnits(
    refundFee.amount,
    refundFee.decimals
  );

  let decimals = 18;

  if (erc20) {
    const contract = new ethers.Contract(erc20, ERC20_ABI.abi, signer);
    decimals = await contract.decimals();
  }

  const value = ethers.utils.parseUnits(amount, decimals);

  let message;
  if (args.message) {
    try {
      const msg = JSON.parse(args.message);
      if (
        Array.isArray(msg) &&
        msg.length === 2 &&
        Array.isArray(msg[0]) &&
        msg[0].every((item: string) => typeof item === "string")
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

  if (!args.ignoreChecks) {
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
      if (!args.recipient) {
        throw new Error(
          "--recipient is not specified. Please, provide a valid omnichain contract address on ZetaChain"
        );
      }
      const rpc = client.getEndpoint("evm", "zeta_testnet");
      const provider = new ethers.providers.StaticJsonRpcProvider(rpc);
      const code = await provider.getCode(args.recipient);
      if (code === "0x") {
        throw new Error(
          "seems like --recipient is an EOA and not a contract on ZetaChain. At the same time the --message is not empty, which indicates this is a 'deposit and call' operation. Please, provide a valid omnichain contract address as the --recipient value"
        );
      }
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

  const signerAddress = await signer.getAddress();

  if (args.json) {
    const tx = await client.deposit(data);
    console.log(JSON.stringify(tx, null, 2));
  } else {
    console.log(`
Networks:    ${chain} → zeta_testnet
Amount sent: ${amount} ${symbol || ""}
Sender:      ${signerAddress}
Recipient:   ${args.recipient}`);
    if (message) {
      console.log(`Message:     ${args.message}`);
    }
    if (value.lt(refundFee.amount)) {
      console.log(`
WARNING! Amount ${amount} is less than refund fee ${refundFeeAmount}.
This means if this transaction fails, you will not be able to get
the refund of deposited tokens. Consider increasing the amount.
`);
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
  .addParam("recipient", "Recipient address")
  .addOptionalParam("erc20", "ERC-20 token address")
  .addOptionalParam("message", `Message, like '[["string"], ["hello"]]'`)
  .addFlag("json", "Output in JSON")
  .addFlag("ignoreChecks", "Ignore checks and send the tx");
