import select from "@inquirer/select";
import axios from "axios";
import FormData from "form-data";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getFullyQualifiedName } from "hardhat/utils/contract-names";

const URL = "https://sourcify.dev/server";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  try {
    const checkURL = `${URL}/check-by-addresses`;
    const params = {
      addresses: args.contract,
      chainIds: 7001,
    };
    const res = await axios.get(checkURL, { params });
    if (res.status === 200 && res?.data[0]?.status == "perfect") {
      console.log(`✅ Contract has already been verified.`);
      return;
    }
  } catch (error: any) {}

  const names = await hre.artifacts.getAllFullyQualifiedNames();
  if (names.length === 0) {
    console.error(
      "❌ Error: no contracts found. Please make sure there are compiled contracts."
    );
    return;
  }

  const chosen = parseInt(
    await select({
      choices: names.map((name, i) => ({ name, value: i.toString() })),
      message: "Select a contract to verify:",
    })
  );
  const [path, name] = names[chosen].split(":");

  const metadata = await hre.artifacts.getBuildInfo(
    getFullyQualifiedName(path, name)
  );
  const source = metadata?.input.sources[path]?.content;

  if (!source) {
    console.error(`❌ Source code not found for contract: ${name}`);
    return;
  }

  const formData = new FormData();
  formData.append("address", args.contract);
  formData.append("chain", "7001");
  formData.append("chosenContract", chosen.toString());
  formData.append("files", Buffer.from(source), {
    contentType: "text/plain",
    filename: `${name}.sol`,
  });
  formData.append("files", Buffer.from(JSON.stringify(metadata)), {
    contentType: "application/json",
    filename: "metadata.json",
  });

  const headers = { headers: formData.getHeaders() };
  try {
    await axios.post(URL, formData, headers);
    console.log(
      `✅ Contract verified: https://athens3.explorer.zetachain.com/address/${args.contract}`
    );
  } catch (error: any) {
    console.error(
      `❌ Error during contract verification: ${error.response.data.error}`
    );
  }
};

export const verifyTask = task(
  "verify:zeta",
  "Verify a contract on ZetaChain.",
  main
).addParam("contract", "Contract address to verify");
