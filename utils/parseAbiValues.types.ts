import { z } from "zod";

const solidityTypeSchema = z.union([
  z.literal("address"),
  z.literal("bool"),
  z.literal("bytes"),
  z.literal("int"),
  z.literal("string"),
  z.literal("uint"),
  z.string().regex(/^bytes\d+$/),
  z.string().regex(/^int\d+$/),
  z.string().regex(/^uint\d+$/),
]);

export const solidityTypeArraySchema = z.array(solidityTypeSchema);
