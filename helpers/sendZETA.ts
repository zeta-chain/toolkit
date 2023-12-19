import networks from "@zetachain/networks/dist/src/networks";
import { getAddress } from "@zetachain/protocol-contracts";
import ZetaEthContract from "@zetachain/protocol-contracts/abi/evm/Zeta.eth.sol/ZetaEth.json";
import ZetaConnectorEth from "@zetachain/protocol-contracts/abi/evm/ZetaConnector.eth.sol/ZetaConnectorEth.json";
import ZetaConnectorZEVM from "@zetachain/protocol-contracts/abi/zevm/ZetaConnectorZEVM.sol/ZetaConnectorZEVM.json";
import { ethers } from "ethers";

export const sendZETA = async (
  signer: any,
  amount: string,
  from: string,
  destination: string,
  recipient: string
) => {
  let connectorContract: any;
  const destinationChainId =
    networks[destination as keyof typeof networks]?.chain_id;
  if (!destinationChainId) {
    throw new Error("Invalid destination chain");
  }
  const destinationAddress = recipient || signer.address;

  const fromZetaChain = from === "zeta_testnet";

  const connectorAddress = getAddress("connector", from as any);
  const zetaTokenAddress = getAddress("zetaToken", from as any);
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
  const value = ethers.utils.parseEther(amount);

  if (fromZetaChain) {
    await signer.sendTransaction({ to: zetaTokenAddress, value });
  }

  await (
    await zetaTokenContract.connect(signer).approve(connectorAddress, value)
  ).wait();

  return await connectorContract.connect(signer).send({
    destinationAddress,
    destinationChainId,
    destinationGasLimit: 5000000,
    message: ethers.utils.arrayify([]),
    zetaParams: ethers.utils.arrayify([]),
    zetaValueAndGas: value,
  });
};
