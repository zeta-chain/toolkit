/**
 * Creates a predicate function that checks if exactly one of two properties is truthy in an object.
 * @param a - The first property key to check
 * @param b - The second property key to check
 * @returns A function that takes an object and returns true if exactly one of the specified properties is truthy
 */
export const exactlyOneOf =
  <T extends object>(a: keyof T, b: keyof T): ((data: T) => boolean) =>
  (data) =>
    Boolean(data[a]) !== Boolean(data[b]);
