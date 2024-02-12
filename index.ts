import { ZetaChainClient } from "./helpers/client";

const client = new ZetaChainClient({
  chains: {
    zeta_testnet: {
      api: [
        {
          type: "evm",
          url: "https://rpc.ankr.com/zetachain_evm_athens_testnet",
        },
      ],
    },
  },
  network: "testnet",
});

(async () => {
  console.log(await client.getPools());
})();
