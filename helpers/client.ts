import { networks } from "@zetachain/networks";
import merge from "lodash/merge";

export const createClient = (params: any = { chains: {} }): any => {
  const chains: any = { ...networks };

  for (const key in params.chains) {
    chains[key] = merge({}, chains[key], params.chains[key]);
  }

  return chains;
};
