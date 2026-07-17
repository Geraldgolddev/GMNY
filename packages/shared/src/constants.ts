import { Currency } from './enums';

/** Number of decimal places used by each supported currency. */
export const CURRENCY_DECIMALS: Record<Currency, number> = {
  [Currency.USD]: 2,
  [Currency.USDC]: 6,
  [Currency.NGN]: 2,
};

/** Default pagination page size for list endpoints. */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum pagination page size to protect the database. */
export const MAX_PAGE_SIZE = 100;

/** Minimum acceptable password length (enforced by validation + auth). */
export const MIN_PASSWORD_LENGTH = 10;

/** How long a locked exchange-rate quote remains valid, in seconds. */
export const QUOTE_TTL_SECONDS = 60;

/** Queue names for BullMQ workers. */
export const QUEUES = {
  TRANSFERS: 'transfers',
  NOTIFICATIONS: 'notifications',
  EXCHANGE_RATES: 'exchange-rates',
} as const;
