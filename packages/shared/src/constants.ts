export const APP_NAME = 'GMNY';

export const CURRENCY = {
  USD: 'USD',
  USDC: 'USDC',
  NGN: 'NGN',
} as const;

export type SupportedCurrency = (typeof CURRENCY)[keyof typeof CURRENCY];

/** Default access token TTL string consumed by Nest JWT module */
export const DEFAULT_ACCESS_TTL = '15m';

/** Default refresh token TTL string consumed by Nest JWT module */
export const DEFAULT_REFRESH_TTL = '7d';
