import { ZetaChainClient } from "./helpers/client";

const client = new ZetaChainClient({
  chains: {
    goerli_testnet: {
      api: [
        {
          type: "evm",
          url: "https://rpc.ankr.com/eth_goerli",
        },
      ],
    },
  },
});

(async () => {
  console.log(
    await client.getBalances(
      "testnet",
      "0x2cD3D070aE1BD365909dD859d29F387AA96911e1"
    )
  );
})();
