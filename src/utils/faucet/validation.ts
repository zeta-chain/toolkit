import axios from "axios";
import dayjs from "dayjs";
import { z } from "zod";

const githubUserSchema = z.object({
  created_at: z.string(),
  id: z.number(),
  login: z.string(),
  public_repos: z.number(),
  two_factor_authentication: z.boolean().optional(),
});

const githubUserByIdApiResponseSchema = z.object({
  id: z.number(),
  login: z.string(),
  url: z.string(),
});

export const validateGithubAccount = async (token: string) => {
  const { data: userResponse } = await axios.get<unknown>(
    `https://api.github.com/user`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const githubUser = githubUserSchema.parse(userResponse);

  const { data: userByIdResponse } = await axios.get<unknown>(
    `https://api.github.com/user/${githubUser.id}`,
    {
      headers: {
        Accept: "application/json",
      },
    }
  );

  const githubAccountFromUserByIdApi =
    githubUserByIdApiResponseSchema.parse(userByIdResponse);

  if (githubAccountFromUserByIdApi.id !== githubUser.id) {
    throw new Error("Account mismatch.");
  }

  if (githubUser.public_repos < 1) {
    throw new Error("Account has no public repos.");
  }

  const accountCreationDate = dayjs(githubUser.created_at);
  const now = dayjs();

  if (now.diff(accountCreationDate, "month") < 3) {
    throw new Error("Account is too new.");
  }

  return githubUser;
};
