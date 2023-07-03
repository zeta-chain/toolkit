import ZetaConnector from "@zetachain/protocol-contracts/abi/evm/ZetaConnector.eth.sol/ZetaConnectorEth.json";
import ZetaEthContract from "@zetachain/protocol-contracts/abi/evm/Zeta.eth.sol/ZetaEth.json";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getAddress } from "@zetachain/protocol-contracts";
import { parseEther } from "ethers/lib/utils";
import { ZetaConnectorEth } from "@zetachain/protocol-contracts/typechain-types";

declare const hre: any;

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  let connectorContract: ZetaConnectorEth;

  const { ethers } = hre as any;

  const [signer] = await ethers.getSigners();
  const connectorAddress = getAddress("connector", hre.network.name as any);
  const zetaTokenAddress = getAddress("zetaToken", hre.network.name as any);

  connectorContract = new ethers.Contract(
    connectorAddress,
    ZetaConnector.abi,
    signer
  );
  const zetaTokenContract = new ethers.Contract(
    zetaTokenAddress,
    ZetaEthContract.abi,
    signer
  );
  await (
    await zetaTokenContract
      .connect(signer)
      .approve(connectorAddress, parseEther("5"))
  ).wait();
  const tx = await connectorContract.connect(signer).send({
    destinationChainId: 97,
    destinationAddress: signer.address,
    zetaValueAndGas: parseEther("5"),
    destinationGasLimit: 500000,
    message: ethers.utils.arrayify([]),
    zetaParams: ethers.utils.arrayify([]),
  });
  console.log(tx);
};

export const sendTask = task("send", "", main);
