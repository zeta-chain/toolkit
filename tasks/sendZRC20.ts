import { getAddress } from "@zetachain/protocol-contracts";
import ZRC20 from "@zetachain/protocol-contracts/abi/zevm/ZRC20.sol/ZRC20.json";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

declare const hre: any;

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const { ethers } = hre as any;
  // const [signer] = await ethers.getSigners();
  let amount;
  try {
    amount = ethers.utils.parseEther(args.amount);
  } catch (e) {
    throw new Error(
      `${args.amount} is not a number and not a valid value for --amount, ${e}`
    );
  }
  let tx;
  if (hre.network.name === "zeta_testnet") {
    let ZRC20Address;
    try {
      ZRC20Address = getAddress("zrc20", args.destination);
    } catch (e) {
      throw new Error(`getAddress: ${e}`);
    }
    const contract = new ethers.Contract(ZRC20Address, ZRC20.abi, signer);
    await (await contract.connect(signer).approve(ZRC20Address, amount)).wait();
    tx = await contract.connect(signer).withdraw(signer.address, amount);
  } else if (args.destination === "zeta_testnet") {
    const TSSAddress = getAddress("tss", hre.network.name);
    tx = await signer.sendTransaction({
      to: TSSAddress,
      value: amount,
    });
  } else {
    throw new Error("Either --network or --destination should be zeta_testnet");
  }
  console.log(`Transaction hash: ${tx.hash}`);
};

export const sendZRC20Task = task(
  "send-zrc20",
  "Send ZRC-20 tokens to and from ZetaChain",
  main
)
  .addParam("amount", "Amount of ZRC-20 to send")
  .addParam("destination", "Destination chain");
