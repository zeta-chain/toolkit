import { SOLANA_TOKEN_PROGRAM } from "../types/shared.constants";
import { z } from "zod";

export const solanaDepositOptionsSchema = z.object({
  amount: z.string(),
  recipient: z.string(),
  mnemonic: z.string().optional(),
  privateKey: z.string().optional(),
  tokenProgram: z.string().default(SOLANA_TOKEN_PROGRAM),
  mint: z.string().optional(),
  network: z.string(),
});
