import { getAddress } from "@zetachain/protocol-contracts";
import ZetaEthContract from "@zetachain/protocol-contracts/abi/evm/Zeta.eth.sol/ZetaEth.json";
import ZetaConnectorZEVM from "@zetachain/protocol-contracts/abi/zevm/ConnectorZEVM.sol/ZetaConnectorZEVM.json";
import ZetaConnectorEth from "@zetachain/protocol-contracts/abi/evm/ZetaConnector.eth.sol/ZetaConnectorEth.json";
import { parseEther } from "ethers/lib/utils";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

declare const hre: any;

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  let connectorContract: any;

  const { ethers } = hre as any;

  const [signer] = await ethers.getSigners();

  const destinationChainId = hre.config.networks[args.destination]?.chainId;
  if (!destinationChainId) {
    throw new Error("Invalid destination chain");
  }
  const destinationAddress = args.recipient || signer.address;

  const fromZetaChain = hre.network.name === "zeta_testnet";

  const connectorAddress = getAddress("connector", hre.network.name as any);
  const zetaTokenAddress = getAddress("zetaToken", hre.network.name as any);
  connectorContract = new ethers.Contract(
    connectorAddress,
    fromZetaChain ? ZetaConnectorZEVM.abi : ZetaConnectorEth.abi,
    signer
  );
  const zetaTokenContract = new ethers.Contract(
    zetaTokenAddress,
    ZetaEthContract.abi,
    signer
  );
  const amount = parseEther(args.amount);

  if (fromZetaChain) {
    await signer.sendTransaction({
      to: zetaTokenAddress,
      value: amount,
    });
  }

  await (
    await zetaTokenContract.connect(signer).approve(connectorAddress, amount)
  ).wait();

  const tx = await connectorContract.connect(signer).send({
    destinationAddress,
    destinationChainId,
    destinationGasLimit: 5000000,
    message: ethers.utils.arrayify([]),
    zetaParams: ethers.utils.arrayify([]),
    zetaValueAndGas: amount,
  });
};

export const sendZETATask = task(
  "send-zeta",
  "Send ZETA tokens between connected chains",
  main
)
  .addParam("amount", "Amount of ZETA to send")
  .addParam("destination", "Destination chain");
