import { z } from "zod";

import { evmAddressSchema } from "./shared.schema";

export const faucetOptionsSchema = z.object({
  address: evmAddressSchema.optional(),
  name: z.string().optional(),
});
