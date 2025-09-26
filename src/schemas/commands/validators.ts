import { z } from "zod";

export const validatorsListOptionsSchema = z.object({
  json: z.boolean().optional(),
  rpc: z.string(),
  status: z.enum(["Bonded", "Unbonding", "Unbonded", "Unspecified"]),
});

export type ValidatorsListOptions = z.infer<typeof validatorsListOptionsSchema>;
