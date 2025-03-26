type KnownKeys<T> = {
  [K in keyof T]: string extends K ? never : number extends K ? never : K;
}[keyof T];

export type OmitIndexSignature<T> = Pick<T, KnownKeys<T>>;
