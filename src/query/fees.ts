import ZRC20ABI from "@zetachain/protocol-contracts/abi/ZRC20.sol/ZRC20.json";
import { QueryAllForeignCoinsResponseSDKType } from "@zetachain/sdk-cosmos/zetachain/zetacore/fungible/query";
import axios from "axios";
import { ethers } from "ethers";

import { Call } from "../../types/balances.types";
import MULTICALL3_ABI from "../../utils/multicall3.json";
import { MULTICALL_ADDRESS } from "../constants/addresses";
import { FeesOptions, FeesParams, WithdrawGasFeeResult } from "../types/fees";

export const getFees = async (
  params: FeesParams = {},
  options: FeesOptions
): Promise<WithdrawGasFeeResult[]> => {
  try {
    const response = await axios.get<QueryAllForeignCoinsResponseSDKType>(
      `${options.api}/zeta-chain/fungible/foreign_coins`
    );

    if (response.data.foreignCoins.length === 0) {
      throw new Error("No foreign coins found");
    }

    const zrc20Contracts = response.data.foreignCoins.filter(
      (coin) =>
        coin.zrc20_contract_address && coin.zrc20_contract_address !== ""
    );

    if (zrc20Contracts.length === 0) {
      throw new Error("No ZRC20 contracts found");
    }

    const zrc20Interface = new ethers.Interface(ZRC20ABI.abi);

    const multicallContexts: Call[] = zrc20Contracts.map((contract) => {
      const callData = params.gasLimit
        ? zrc20Interface.encodeFunctionData("withdrawGasFeeWithGasLimit", [
            params.gasLimit,
          ])
        : zrc20Interface.encodeFunctionData("withdrawGasFee");

      return {
        callData,
        target: contract.zrc20_contract_address,
      };
    });

    const provider = new ethers.JsonRpcProvider(options.rpc);
    const multicallInterface = new ethers.Interface(MULTICALL3_ABI);
    const multicallContract = new ethers.Contract(
      MULTICALL_ADDRESS,
      multicallInterface,
      provider
    );

    const [, returnData] = (await multicallContract.aggregate.staticCall(
      multicallContexts
    )) as [bigint, string[]];

    const results: WithdrawGasFeeResult[] = [];

    for (let i = 0; i < returnData.length; i++) {
      try {
        const decoded = zrc20Interface.decodeFunctionResult(
          params.gasLimit ? "withdrawGasFeeWithGasLimit" : "withdrawGasFee",
          returnData[i] as ethers.BytesLike
        );
        const gasTokenAddress = decoded[0] as string;
        const gasFee = decoded[1] as bigint;

        const contract = zrc20Contracts[i];

        const gasToken = response.data.foreignCoins.find(
          (coin) =>
            coin.zrc20_contract_address.toLowerCase() ===
            gasTokenAddress.toLowerCase()
        );

        if (!gasToken) {
          console.error(
            `Gas token not found for address ${gasTokenAddress} in contract ${contract.symbol}`
          );
          continue;
        }

        results.push({
          chain_id: String(contract.foreign_chain_id),
          gasFeeAmount: gasFee.toString(),
          gasFeeDecimals: gasToken.decimals,
          gasTokenAddress,
          gasTokenSymbol: gasToken.symbol,
          symbol: contract.symbol,
          zrc20Address: contract.zrc20_contract_address,
        });
      } catch (error) {
        console.error(
          `Failed to decode withdrawGasFee for ${zrc20Contracts[i].symbol}:`,
          error
        );
      }
    }

    results.sort((a, b) => a.chain_id.localeCompare(b.chain_id));

    return results;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unknown error occurred"
    );
  }
};
