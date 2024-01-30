import { createClient } from "./helpers/client";

console.log(
  createClient({
    chains: {
      goerli_testnet: {
        api: [
          {
            url: "https://rpc.example.org",
            type: "evm",
          },
        ],
      },
    },
  })
);
