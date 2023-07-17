declare module "@zetachain/faucet-cli/dist/commands/drip" {
  interface Coin {
    chain: string;
    symbol: string;
  }

  interface Body {
    address: string;
    coins: Coin[];
  }

  interface Response {
    body: Body;
    statusCode: number;
  }

  interface OptionValues {
    address: string;
    chain: string;
  }

  function drip(
    options: OptionValues,
    unavailable_chains?: string[]
  ): Promise<void>;

  con;

  export { drip };
}

declare module "@zetachain/faucet-cli/dist/constants" {
  export const VALID_CHAINS: string[];
}
