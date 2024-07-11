import { getAddress, ParamChainName } from "@zetachain/protocol-contracts";
import ZetaToken from "@zetachain/protocol-contracts/abi/evm/Zeta.eth.sol/ZetaEth.json";
import ZetaConnectorEth from "@zetachain/protocol-contracts/abi/evm/ZetaConnector.eth.sol/ZetaConnectorEth.json";
import ZetaConnectorZEVM from "@zetachain/protocol-contracts/abi/zevm/ZetaConnectorZEVM.sol/ZetaConnectorZEVM.json";
import { ethers } from "ethers";

import { ZetaChainClient } from "./client";

/**
 *
 * Initiates a cross-chain transfer of ZETA tokens from the source chain to the
 * destination chain.
 *
 * @param this - ZetaChainClient instance.
 * @param options - Send ZETA options.
 * @param options.chain - Source chain label.
 * @param options.destination - Destination chain label.
 * @param options.amount - Amount of ZETA tokens to be sent in human readable form.
 * @param options.recipient - Optional recipient address for the token transfer. If not
 * provided, the token transfer is made to the signer's address.
 * @param options.gasLimit - Optional gas limit on the destination chain.
 *
 * @returns A promise that resolves with the transaction details upon success.
 */
export const sendZeta = async function (
  this: ZetaChainClient,
  {
    chain,
    destination,
    recipient,
    gasLimit = 500000,
    amount,
  }: {
    amount: string;
    chain: string;
    destination: string;
    gasLimit?: Number;
    recipient: string;
  }
) {
  let signer;
  if (this.signer) {
    signer = this.signer;
  } else if (this.wallet) {
    const rpc = this.getEndpoint("evm", chain);
    if (!rpc) throw new Error(`No EVM RPC endpoint found for ${chain} chain.`);
    const provider = new ethers.providers.JsonRpcProvider(rpc);
    signer = this.wallet.connect(provider);
  } else {
    throw new Error("No wallet or signer found.");
  }

  const fromZetaChain = ["zeta_testnet", "zeta_mainnet"].includes(chain);

  const connector = getAddress("connector", chain as ParamChainName);
  if (!connector) {
    throw new Error(`connector address on chain ${chain} not found`);
  }
  const zetaToken = getAddress("zetaToken", chain as ParamChainName);
  if (!zetaToken) {
    throw new Error(`zetaToken address on chain ${chain} not found`);
  }

  const connectorContract = new ethers.Contract(
    connector,
    fromZetaChain ? ZetaConnectorZEVM.abi : ZetaConnectorEth.abi,
    signer
  );

  const zetaTokenContract = new ethers.Contract(
    zetaToken,
    ZetaToken.abi,
    signer
  );

  const value = ethers.utils.parseEther(amount);

  if (fromZetaChain) {
    await signer.sendTransaction({ to: zetaToken, value });
  }

  const approveTx = await zetaTokenContract.approve(connector, value);
  await approveTx.wait();

  const destinationChainId = this.getChains()[destination]?.chain_id;
  const destinationAddress = recipient;

  return await connectorContract.send({
    destinationAddress,
    destinationChainId,
    destinationGasLimit: gasLimit,
    message: ethers.utils.toUtf8Bytes(""),
    zetaParams: ethers.utils.toUtf8Bytes(""),
    zetaValueAndGas: value,
  });
};
