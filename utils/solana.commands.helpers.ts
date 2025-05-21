import { z } from "zod";

import { SOLANA_TOKEN_PROGRAM } from "../types/shared.constants";

export const solanaDepositOptionsSchema = z
  .object({
    amount: z.string(),
    mint: z.string().optional(),
    mnemonic: z.string().optional(),
    network: z.string(),
    privateKey: z.string().optional(),
    recipient: z.string(),
    tokenProgram: z.string().default(SOLANA_TOKEN_PROGRAM),
  })
  .refine((data) => !(data.mnemonic && data.privateKey), {
    message: "Only one of mnemonic or privateKey can be provided, not both",
  });
