import axios, { isAxiosError } from "axios";

import { FAUCET_BASE_URL } from "../../constants/faucet";
import { getGithubAccessToken } from "./github";
import { validateGithubAccount } from "./validation";

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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ Invalid GitHub account.", errorMessage);

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
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      console.error(
        "❌ Could not request assets from faucet.",
        error.response?.data || error.message
      );
    } else {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ Could not request assets from faucet.", errorMessage);
    }
  }
};
