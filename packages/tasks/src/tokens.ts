import { task } from "hardhat/config";

import { ZetaChainClient } from "../../client/src/";

const main = async (args: any, hre: any) => {
  const client = new ZetaChainClient({
    network: args.mainnet ? "mainnet" : "testnet",
  });
  const tokens = await client.getForeignCoins();
  const chains = await client.getSupportedChains();

  const tableData = tokens.map((token: any) => {
    const chain = chains.find(
      (chain: any) => chain.chain_id === token.foreign_chain_id
    );
    const name = chain ? chain.chain_name : "Unsupported Chain";
    return {
      Chain: name,
      "ERC-20 on Connected Chain": token.asset || "",
      Symbol: token.symbol,
      Type: token.coin_type,
      "ZRC-20 decimals": token.decimals,
      "ZRC-20 on ZetaChain": token.zrc20_contract_address,
    };
  });

  tableData.sort((a: any, b: any) => a.Chain.localeCompare(b.Chain));

  console.table(tableData);
};

export const tokensTask = task(
  "tokens",
  "Show ZRC-20 address of supported gas and ERC-20 tokens",
  main
).addFlag("mainnet", "Run the task on mainnet");
