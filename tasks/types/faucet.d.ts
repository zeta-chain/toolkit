declare module "@zetachain/faucet-cli/dist/commands/drip" {
  interface Coin {
    chain: string;
    symbol: string;
  }

  interface Body {
    coins: Coin[];
    address: string;
  }

  interface Response {
    statusCode: number;
    body: Body;
  }

  interface OptionValues {
    chain: string;
    address: string;
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
