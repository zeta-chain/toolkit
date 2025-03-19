import { getAddress, ParamChainName } from "@zetachain/protocol-contracts";
import ZetaToken from "@zetachain/protocol-contracts/abi/Zeta.non-eth.sol/ZetaNonEth.json";
import { ethers } from "ethers";

import { validateSigner } from "../../../utils";
import { ZetaChainClient } from "./client";
import type {
  ZetaConnectorContract,
  ZetaTokenContract,
} from "./sendZeta.types";
import { sendFunctionAbi } from "./sendZeta.types";

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
    gasLimit?: number;
    recipient: string;
  }
) {
  let signer: ethers.Signer;

  if (this.signer) {
    signer = validateSigner(this.signer);
  } else if (this.wallet) {
    const rpc = this.getEndpoint("evm", chain);
    if (!rpc) throw new Error(`No EVM RPC endpoint found for ${chain} chain.`);
    const provider = new ethers.JsonRpcProvider(rpc);
    signer = validateSigner(this.wallet.connect(provider));
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

  const connectorContract: ZetaConnectorContract = new ethers.Contract(
    connector,
    // fromZetaChain ? ZetaConnectorZEVM.abi : ZetaConnectorEth.abi,
    /**
     * @todo (Hernan): Restore the above commented line once the new connector is enabled to be used
     * on testnet/mainnet through the Gateway and remove the sendFunctionAbi hardcoded abi.
     */
    sendFunctionAbi,
    signer
  );

  const zetaTokenContract = new ethers.Contract(
    zetaToken,
    ZetaToken.abi,
    signer
  ) as ZetaTokenContract;

  const value = ethers.parseEther(amount);

  if (fromZetaChain) {
    await signer.sendTransaction({ to: zetaToken, value });
  }

  const approveTx = await zetaTokenContract.approve(connector, value);
  await approveTx.wait();

  const destinationChainId = this.getChains()[destination]?.chain_id;
  const destinationAddress = recipient;

  if (!connectorContract.send) {
    throw new Error("Connector contract does not have a send method");
  }

  const sendTx = await connectorContract.send({
    destinationAddress,
    destinationChainId,
    destinationGasLimit: gasLimit,
    message: ethers.toUtf8Bytes(""),
    zetaParams: ethers.toUtf8Bytes(""),
    zetaValueAndGas: value,
  });

  return sendTx;
};
