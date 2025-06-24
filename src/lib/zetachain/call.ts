import GatewayABI from "@zetachain/protocol-contracts/abi/GatewayZEVM.sol/GatewayZEVM.json";
import ZRC20ABI from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import { AbiCoder, ethers } from "ethers";

import {
  CallOptions,
  GatewayContract,
  RevertOptions,
  TxOptions,
  ZRC20Contract,
} from "../../../types/contracts.types";
import { ParseAbiValuesReturnType } from "../../../types/parseAbiValues.types";
import { handleError } from "../../../utils/handleError";
import { toHexString } from "../../../utils/toHexString";

type ZetachainCallParams = {
  callOptions: CallOptions;
  data?: string;
  function?: string;
  receiver: string;
  revertOptions: RevertOptions;
  types?: string[];
  values?: ParseAbiValuesReturnType;
  zrc20: string;
};

type ZetachainCallOptions = {
  gateway?: string;
  signer: ethers.Wallet;
  txOptions?: TxOptions;
};

export const zetachainCall = async (
  params: ZetachainCallParams,
  options: ZetachainCallOptions
) => {
  const gatewayAddress = options.gateway;
  if (!gatewayAddress) {
    throw new Error("Gateway ZetaChain address is required");
  }

  const gateway = new ethers.Contract(
    gatewayAddress,
    GatewayABI.abi,
    options.signer
  ) as GatewayContract;

  const revertOptions = {
    ...params.revertOptions,
    revertMessage: toHexString(params.revertOptions.revertMessage),
  };

  let message: string;

  if (params.data) {
    // For non-EVM chains, use the raw data directly
    message = params.data.startsWith("0x") ? params.data : `0x${params.data}`;
  } else if (params.types && params.values && params.function) {
    // For EVM chains, encode the function and parameters
    const functionSignature = ethers.id(params.function).slice(0, 10);
    const abiCoder = AbiCoder.defaultAbiCoder();
    const encodedParameters = abiCoder.encode(params.types, params.values);
    message = ethers.hexlify(
      ethers.concat([functionSignature, encodedParameters])
    );
  } else {
    const errorMessage = handleError({
      context: "Invalid arguments",
      error: new Error(
        "Either provide 'data' OR provide all three of 'function', 'types', and 'values' together. These two approaches are mutually exclusive."
      ),
      shouldThrow: false,
    });

    throw new Error(errorMessage);
  }

  const zrc20 = new ethers.Contract(
    params.zrc20,
    ZRC20ABI.abi,
    options.signer
  ) as ZRC20Contract;

  const [gasZRC20, gasFee] = await zrc20.withdrawGasFeeWithGasLimit(
    params.callOptions.gasLimit
  );
  const gasZRC20Contract = new ethers.Contract(
    gasZRC20,
    ZRC20ABI.abi,
    options.signer
  ) as ZRC20Contract;

  const approve = await gasZRC20Contract.approve(
    gatewayAddress,
    gasFee,
    options.txOptions || {}
  );

  await approve.wait();

  const receiver = toHexString(params.receiver);

  const callAbiSignature =
    "call(bytes,address,bytes,(uint256,bool),(address,bool,address,bytes,uint256))";
  const gatewayCallFunction = gateway[
    callAbiSignature
  ] as GatewayContract["call"];

  const tx = await gatewayCallFunction(
    receiver,
    gasZRC20,
    message,
    params.callOptions,
    revertOptions,
    options.txOptions || {}
  );

  return { gasFee, gasZRC20, tx };
};
