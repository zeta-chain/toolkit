import axios from "axios";

import { FAUCET_BASE_URL } from "../../constants/faucet";
import { validateGithubAccount } from "./validation";
import { getGithubAccessToken } from "./github";

interface DripParams {
  address: string;
}

export const drip = async ({ address }: DripParams) => {
  try {
    const token = await getGithubAccessToken();

    if (!token) {
      console.error("❌ Cannot complete request without GitHub access token.");

      return;
    }

    try {
      await validateGithubAccount(token);
    } catch (error: any) {
      console.error("❌ Invalid GitHub account.", error.message);

      return;
    }

    console.info(`🔄 Requesting assets for ${address} in ZetaChain Athens`);

    const { data } = await axios.post<string>(
      `${FAUCET_BASE_URL}/drip`,
      { address },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const message = data || "Queued for faucet drip";

    console.info(
      `✅ ${message}. Please wait a few minutes for the assets to arrive.`
    );
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error(
        "❌ Could not request assets from faucet.",
        error.response?.data || error.message
      );
    } else {
      console.error("❌ Could not request assets from faucet.", error.message);
    }
  }
};
