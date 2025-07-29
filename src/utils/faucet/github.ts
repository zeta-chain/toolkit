import axios from "axios";
import os from "os";
import path from "path";
import { createInterface } from "readline";
import { z } from "zod";

import {
  safeExists,
  safeMkdir,
  safeReadJson,
  safeUnlink,
  safeWriteFile,
} from "../../../utils/fsUtils";
import {
  ACCESS_TOKEN_FILE_PATH,
  CLIENT_ID,
  GITHUB_REQUEST_CODE_URL,
  GITHUB_REQUEST_TOKEN_URL,
  GITHUB_WHOAMI_URL,
} from "../../constants/faucet";

// Zod schema for token data validation
const TokenDataSchema = z.object({
  access_token: z.string(),
});

type TokenData = z.infer<typeof TokenDataSchema>;

const getTokenFilePath = () => {
  const homeDir = os.homedir();
  return path.resolve(ACCESS_TOKEN_FILE_PATH.replace("~", homeDir));
};

const readTokenFromFile = (): TokenData => {
  const filePath = getTokenFilePath();

  if (!safeExists(filePath)) {
    throw new Error("Token file does not exist");
  }

  try {
    const parsed = safeReadJson<unknown>(filePath);
    const validationResult = TokenDataSchema.safeParse(parsed);

    if (validationResult.success) {
      return validationResult.data;
    }

    throw new Error(
      `Invalid token data format: ${validationResult.error.message}`
    );
  } catch (error) {
    // If it's a file not found error, re-throw as a simple "does not exist" message
    if (error instanceof Error && error.message.includes("ENOENT")) {
      throw new Error("Token file does not exist");
    }

    throw new Error(
      `Failed to read or validate token data: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

const writeTokenToFile = (token: TokenData) => {
  const filePath = getTokenFilePath();
  const dirPath = path.dirname(filePath);

  // Ensure the directory exists using safe helper
  safeMkdir(dirPath);

  // Write token data using safe helper
  safeWriteFile(filePath, token);
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
      headers: {
        Accept: "application/json",
      },
      method: "post",
      params: {
        client_id: CLIENT_ID,
      },
      url: GITHUB_REQUEST_CODE_URL,
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      "❌ Could not request device code from GitHub.",
      errorMessage
    );
  }

  return null;
};

const requestToken = async (deviceCode: string) => {
  try {
    const accessTokenSchema = z.object({
      access_token: z.string().optional(),
      error: z.string().optional(),
      error_description: z.string().optional(),
      error_uri: z.string().optional(),
    });

    const response = await axios({
      headers: {
        Accept: "application/json",
      },
      method: "post",
      params: {
        client_id: CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      },
      url: GITHUB_REQUEST_TOKEN_URL,
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      "❌ Could not request access token from GitHub.",
      errorMessage
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Could not request user from GitHub.", errorMessage);
  }

  return null;
};

export const getGithubAccessToken = async (): Promise<string | null> => {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const readLineAsync = (msg: string) => {
    return new Promise<string>((resolve) => {
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
  } catch (error: unknown) {
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
  if (safeExists(filePath)) {
    safeUnlink(filePath);

    console.info("👤 GitHub logged out.");
  } else {
    console.info("👤 GitHub not logged in.");
  }
};
