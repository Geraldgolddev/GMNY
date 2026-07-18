export type LiveUsdNgnQuote = {
  rate: number;
  source: string;
  fetchedAt: Date;
};

export interface FxRateProvider {
  fetchUsdNgn(): Promise<LiveUsdNgnQuote>;
}

export const FX_RATE_PROVIDER = Symbol('FX_RATE_PROVIDER');
