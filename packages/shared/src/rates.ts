export enum QuoteDirection {
  USD_TO_NGN = 'USD_TO_NGN',
  NGN_TO_USD = 'NGN_TO_USD',
}

export type ExchangeRateView = {
  pair: 'USDNGN';
  baseCurrency: 'USD';
  quoteCurrency: 'NGN';
  /** 1 USD = rate NGN */
  rate: number;
  source: string;
  fetchedAt: string;
  stale: boolean;
  label: string;
};

export type QuoteRequest = {
  direction: QuoteDirection;
  amount: number;
};

export type QuoteResponse = {
  direction: QuoteDirection;
  sourceCurrency: 'USD' | 'NGN';
  destCurrency: 'USD' | 'NGN';
  sourceAmount: number;
  destAmount: number;
  rate: number;
  fetchedAt: string;
  source: string;
};
