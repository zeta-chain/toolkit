import { getAddress, ParamChainName } from "@zetachain/protocol-contracts";
import ZetaToken from "@zetachain/protocol-contracts/abi/evm/Zeta.eth.sol/ZetaEth.json";
import ZetaConnector from "@zetachain/protocol-contracts/abi/evm/ZetaConnector.base.sol/ZetaConnectorBase.json";
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
    gasLimit,
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

  const connector = getAddress("connector", chain as ParamChainName);
  const connectorContract = new ethers.Contract(
    connector as any,
    ZetaConnector.abi,
    signer
  );
  const zetaToken = getAddress("zetaToken", chain as ParamChainName);
  const zetaTokenContract = new ethers.Contract(
    zetaToken as any,
    ZetaToken.abi,
    signer
  );

  const approveTx = await zetaTokenContract.approve(
    connector,
    ethers.utils.parseEther(amount)
  );
  await approveTx.wait();

  const destinationChainId = this.getChains()[destination]?.chain_id;
  const destinationAddress = recipient ? recipient : signer.address;

  return await connectorContract.send({
    destinationAddress,
    destinationChainId,
    destinationGasLimit: gasLimit,
    message: ethers.utils.toUtf8Bytes(""),
    zetaParams: ethers.utils.toUtf8Bytes(""),
    zetaValueAndGas: ethers.utils.parseEther(amount),
  });
};
