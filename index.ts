import { ZetaChainClient } from "./helpers/client";

const client = new ZetaChainClient({
  // chains: {
  //   goerli_testnet: {
  //     api: [
  //       {
  //         type: "evm",
  //         url: "https://rpc.ankr.com/eth_goerli",
  //       },
  //     ],
  //   },
  // },
});

(async () => {
  console.log(await client.getFees("mainnet"));
})();
