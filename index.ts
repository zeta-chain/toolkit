import { ZetaChainClient } from "./helpers/client";

const client = new ZetaChainClient({
  network: "testnet",
});

(async () => {
  console.log(await client.getFees());
})();
