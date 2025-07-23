import axios from "axios";
import fs from "fs";
import path from "path";
import os from "os";
import { createInterface } from "readline";
import { z } from "zod";

import {
  ACCESS_TOKEN_FILE_PATH,
  CLIENT_ID,
  GITHUB_REQUEST_CODE_URL,
  GITHUB_REQUEST_TOKEN_URL,
  GITHUB_WHOAMI_URL,
} from "../../constants/faucet";

const getTokenFilePath = () => {
  const homeDir = os.homedir();
  return path.resolve(ACCESS_TOKEN_FILE_PATH.replace("~", homeDir));
};

const readTokenFromFile = () => {
  const filePath = getTokenFilePath();
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const writeTokenToFile = (token: any) => {
  const filePath = getTokenFilePath();
  const dirPath = path.dirname(filePath);

  // Ensure the directory exists
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(token), "utf8");
};

const requestDeviceCode = async () => {
  try {
    const requestCodeSchema = z.object({
      device_code: z.string(),
      expires_in: z.number(),
      interval: z.number(),
      user_code: z.string(),
      verification_uri: z.string(),
    });

    const response = await axios({
      method: "post",
      url: GITHUB_REQUEST_CODE_URL,
      params: {
        client_id: CLIENT_ID,
      },
      headers: {
        Accept: "application/json",
      },
    });

    const parseResult = requestCodeSchema.safeParse(response.data);

    if (parseResult.success) {
      return parseResult.data;
    }

    console.error(
      "❌ Could not parse device code from GitHub.",
      response.data,
      parseResult.error.message
    );
  } catch (error: any) {
    console.error(
      "❌ Could not request device code from GitHub.",
      error.message
    );
  }

  return null;
};

const requestToken = async (deviceCode: string) => {
  try {
    const accessTokenSchema = z.object({
      error: z.string().optional(),
      error_description: z.string().optional(),
      error_uri: z.string().optional(),
      access_token: z.string().optional(),
    });

    const response = await axios({
      method: "post",
      url: GITHUB_REQUEST_TOKEN_URL,
      params: {
        client_id: CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      },
      headers: {
        Accept: "application/json",
      },
    });

    const parseResult = accessTokenSchema.safeParse(response.data);

    if (parseResult.success) {
      return parseResult.data;
    }

    console.error(
      "❌ Could not parse access token from GitHub.",
      response.data,
      parseResult.error.message
    );
  } catch (error: any) {
    console.error(
      "❌ Could not request access token from GitHub.",
      error.message
    );
  }

  return null;
};

const whoami = async (accessToken?: string) => {
  try {
    const whoamiSchema = z.object({
      login: z.string(),
    });

    const response = await axios.get(GITHUB_WHOAMI_URL, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const parseResult = whoamiSchema.safeParse(response.data);

    if (parseResult.success) {
      return parseResult.data;
    }
  } catch (error: any) {
    console.error("❌ Could not request user from GitHub.", error.message);
  }

  return null;
};

export const getGithubAccessToken = async (): Promise<string | null> => {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const readLineAsync = (msg: string) => {
    return new Promise((resolve) => {
      readline.question(msg, (userRes) => {
        resolve(userRes);
      });
    });
  };

  try {
    // Checking saved access token.
    const { access_token } = readTokenFromFile();

    const whoamiInfo = await whoami(access_token);

    if (whoamiInfo?.login) {
      console.info(`🪪 GitHub logged as ${whoamiInfo.login}.`);
      readline.close();
      return access_token;
    }

    console.error("❌ Invalid access token.");
  } catch (error: any) {
    // Need to request a new access token.

    // Requesting device code.
    const deviceCodeInfo = await requestDeviceCode();

    if (!deviceCodeInfo) {
      console.error("❌ Cannot continue without device code.");
      readline.close();
      return null;
    }

    const deviceCode = deviceCodeInfo.device_code;

    // Asking user to confirm device verification.
    await readLineAsync(
      `🔐 Please confirm GitHub login at: '${deviceCodeInfo.verification_uri}' using this code: '${deviceCodeInfo.user_code}', and then press Enter to continue.`
    );

    // Requesting access token.
    const accessTokenInfo = await requestToken(deviceCode);
    if (
      !accessTokenInfo ||
      accessTokenInfo.error ||
      !accessTokenInfo.access_token
    ) {
      console.error(
        "❌",
        accessTokenInfo?.error_description ||
          "Failed to get access token from GitHub."
      );

      readline.close();
      return null;
    }

    // Verifiying access token.
    const whoamiInfo = await whoami(accessTokenInfo.access_token);

    if (!whoamiInfo?.login) {
      console.error("❌ Failed to verify access token from GitHub.");

      readline.close();
      return null;
    }

    // Saving access token.
    writeTokenToFile({ access_token: accessTokenInfo.access_token });

    console.info(`🪪 GitHub logged as ${whoamiInfo.login}.`);

    readline.close();
    return accessTokenInfo.access_token;
  }

  readline.close();
  return null;
};

export const logoutGithub = () => {
  const filePath = getTokenFilePath();
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);

    console.info("👤 GitHub logged out.");
  } else {
    console.info("👤 GitHub not logged in.");
  }
};
