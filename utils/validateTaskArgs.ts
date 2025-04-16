import { z } from "zod";

/**
 * Formats Zod validation errors into a user-friendly message
 */
const formatZodError = (error: z.ZodError): string => {
  const errors = error.errors.map((err) => {
    const path = err.path.join(".");
    return path ? `${path}: ${err.message}` : err.message;
  });

  return errors.join("\n");
};

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
    const errorMessage = formatZodError(result.error);
    console.error(`\x1b[31m${errorMessage}\x1b[0m`);
    process.exit(1);
  }

  return result.data;
};
