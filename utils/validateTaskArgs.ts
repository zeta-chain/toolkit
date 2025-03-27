import { z } from "zod";

/**
 * Validates task arguments against a Zod schema
 *
 * @template T - The type of the Zod schema output
 * @template U - The type of the Zod schema input
 * @param args - The unvalidated task arguments
 * @param schema - The Zod schema to validate against
 * @returns The validated and parsed arguments
 * @throws Error if validation fails
 */
export const validateTaskArgs = <T, U = T>(
  args: unknown,
  schema: z.ZodType<T, z.ZodTypeDef, U>
): T => {
  const result = schema.safeParse(args);

  if (!result.success) {
    throw new Error(`Invalid arguments: ${result.error.message}`);
  }

  return result.data;
};
