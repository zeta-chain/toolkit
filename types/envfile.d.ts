declare module 'envfile' {
  export function parseFileSync(path: string): Record<string, string>;
  export function stringifySync(obj: Record<string, string>): string;
  export function parse(content: string): Record<string, string>;
  export function stringify(obj: Record<string, string>): string;
}