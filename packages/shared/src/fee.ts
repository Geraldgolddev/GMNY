import { Money, convert } from './money';
import { Currency } from './enums';
import { FEE_BPS, FLAT_FEE_MINOR } from './constants';

export interface QuoteBreakdown {
  /** Total amount the sender pays, in source minor units. */
  sourceAmountMinor: bigint;
  /** Fee charged, in source minor units. */
  feeMinor: bigint;
  /** Amount actually converted after fees, in source minor units. */
  sendAmountMinor: bigint;
  /** Amount delivered to the recipient, in destination minor units. */
  destAmountMinor: bigint;
  sourceCurrency: Currency;
  destCurrency: Currency;
  /** Decimal exchange rate applied (source → destination). */
  rate: string;
}

/**
 * Compute the transfer fee for a given source amount using the fixed policy
 * (bps + flat). All math is on integer minor units — no floating point.
 */
export function computeFee(sourceAmountMinor: bigint): bigint {
  const percentage = (sourceAmountMinor * BigInt(FEE_BPS)) / 10_000n;
  return percentage + FLAT_FEE_MINOR;
}

/**
 * Build a full quote breakdown: the sender pays `sourceAmountMinor`, we deduct
 * the fee, and convert the remainder to the destination currency at `rate`.
 */
export function buildQuote(
  sourceAmountMinor: bigint,
  rate: string,
  sourceCurrency: Currency,
  destCurrency: Currency,
): QuoteBreakdown {
  const feeMinor = computeFee(sourceAmountMinor);
  const sendAmountMinor = sourceAmountMinor - feeMinor;
  if (sendAmountMinor <= 0n) {
    throw new Error('Source amount does not cover the transfer fee');
  }
  const sendMoney = Money.of(sendAmountMinor, sourceCurrency);
  const destMoney = convert(sendMoney, rate, destCurrency);
  return {
    sourceAmountMinor,
    feeMinor,
    sendAmountMinor,
    destAmountMinor: destMoney.minorUnits,
    sourceCurrency,
    destCurrency,
    rate,
  };
}
