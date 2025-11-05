import { z } from "zod";

import { DEFAULT_DELAY, DEFAULT_TIMEOUT } from "../../constants/commands/cctx";

export const cctxOptionsSchema = z.object({
  delay: z.coerce.number().int().positive().default(DEFAULT_DELAY),
  hash: z.string(),
  interactive: z.coerce.boolean(),
  rpc: z.string(),
  timeout: z.coerce.number().int().min(0).default(DEFAULT_TIMEOUT),
});
