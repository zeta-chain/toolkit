import {
  feesCLIOptionsSchema,
  feesOptionsSchema,
  feesParamsSchema,
} from "src/schemas/commands/fees";
import { z } from "zod";

export type FeesParams = z.infer<typeof feesParamsSchema>;
export type FeesOptions = z.infer<typeof feesOptionsSchema>;
export type FeesCLIOptions = z.infer<typeof feesCLIOptionsSchema>;

export interface WithdrawGasFeeResult {
  chain_id: string;
  gasFeeAmount: string;
  gasFeeDecimals: number;
  gasTokenAddress: string;
  gasTokenSymbol: string;
  symbol: string;
  zrc20Address: string;
}
