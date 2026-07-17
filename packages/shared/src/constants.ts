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

/**
 * Transfer fee policy. The fee is charged in the source currency (USD) as a
 * percentage (basis points) of the send amount plus a flat component.
 *   150 bps = 1.50%; flat = $0.30 (30 cents).
 */
export const FEE_BPS = 150;
export const FLAT_FEE_MINOR = 30n; // 30 USD cents

/** Minimum and maximum send amount per transfer, in USD cents. */
export const MIN_TRANSFER_MINOR = 100n; // $1.00
export const MAX_TRANSFER_MINOR = 5_000_00n; // $5,000.00

/** Queue names for BullMQ workers. */
export const QUEUES = {
  TRANSFERS: 'transfers',
  NOTIFICATIONS: 'notifications',
  EXCHANGE_RATES: 'exchange-rates',
} as const;
