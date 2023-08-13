import { getFees } from "./helpers/fees";

(async () => {
  console.log(await getFees("ccm", "goerli_testnet"));
})();
