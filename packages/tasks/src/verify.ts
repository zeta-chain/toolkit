import select from "@inquirer/select";
import axios, { isAxiosError } from "axios";
import { ethers } from "ethers";
import FormData from "form-data";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getFullyQualifiedName } from "hardhat/utils/contract-names";
import { z } from "zod";

import { validateTaskArgs } from "../../../utils";

interface AxiosErrorResponse {
  error: string; // Define the expected structure of `data`
}

const verifyTaskArgsSchema = z.object({
  contract: z.string().refine((val) => ethers.isAddress(val), {
    message: "Contract address must be a valid EVM address",
  }),
});

type VerifyTaskArgs = z.infer<typeof verifyTaskArgsSchema>;

const URL = "https://sourcify.dev/server";

const main = async (args: VerifyTaskArgs, hre: HardhatRuntimeEnvironment) => {
  const parsedArgs = validateTaskArgs(args, verifyTaskArgsSchema);

  const checkURL = `${URL}/check-by-addresses`;
  const params = {
    addresses: parsedArgs.contract,
    chainIds: 7001,
  };
  const res = await axios.get<{ status: string }[]>(checkURL, { params });

  if (res.status === 200 && res?.data?.[0]?.status === "perfect") {
    throw new Error(`✅ Contract has already been verified.`);
  }

  const names = await hre.artifacts.getAllFullyQualifiedNames();

  if (!names?.length) {
    throw new Error(
      "❌ Error: no contracts found. Please make sure there are compiled contracts."
    );
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
  formData.append("address", parsedArgs.contract);
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
      `✅ Contract verified: https://athens3.explorer.zetachain.com/address/${parsedArgs.contract}`
    );
    return;
  } catch (error: unknown) {
    if (
      isAxiosError(error) &&
      (error.response?.data as AxiosErrorResponse)?.error
    ) {
      throw new Error(
        `❌ Error during contract verification: ${
          (error.response?.data as AxiosErrorResponse)?.error
        }`
      );
    }

    throw new Error(`❌ Error during contract verification: Unknown error`);
  }
};

export const verifyTask = task(
  "verify:zeta",
  "Verify a contract on ZetaChain.",
  main
).addParam("contract", "Contract address to verify");
