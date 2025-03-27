import { ZodSchema } from "zod";

/**
 * Safely parses a JSON string and validates it against a Zod schema.
 * Throws an error if the JSON is invalid or doesn't match the schema.
 *
 * @param jsonString - The JSON string to parse.
 * @param schema - The Zod schema to validate against.
 * @returns The parsed and validated data.
 */
export const parseJson = <T>(jsonString: string, schema: ZodSchema<T>): T => {
  try {
    const result = schema.safeParse(JSON.parse(jsonString));

    if (!result.success) {
      throw new Error(`Invalid JSON data: ${result.error.message}`);
    }

    return result.data;
  } catch (error) {
    throw new Error(
      `Failed to parse JSON: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};
