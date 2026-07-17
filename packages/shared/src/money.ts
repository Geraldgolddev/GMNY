import { Currency } from './enums';
import { CURRENCY_DECIMALS } from './constants';

/**
 * Money is represented as integer minor units (e.g. cents for USD, kobo for
 * NGN, micro-USDC for USDC) to eliminate floating-point rounding errors in
 * financial calculations. All ledger amounts are stored as strings/BigInt.
 */
export class Money {
  private constructor(
    public readonly minorUnits: bigint,
    public readonly currency: Currency,
  ) {}

  static of(minorUnits: bigint | number | string, currency: Currency): Money {
    return new Money(BigInt(minorUnits), currency);
  }

  /** Parse a human decimal string (e.g. "12.34") into Money. */
  static fromDecimal(value: string | number, currency: Currency): Money {
    const decimals = CURRENCY_DECIMALS[currency];
    const normalized = typeof value === 'number' ? value.toFixed(decimals) : value.trim();
    if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
      throw new Error(`Invalid decimal amount: "${value}"`);
    }
    const negative = normalized.startsWith('-');
    const [whole, fraction = ''] = normalized.replace('-', '').split('.');
    const paddedFraction = (fraction + '0'.repeat(decimals)).slice(0, decimals);
    const combined = BigInt(`${whole}${paddedFraction}`);
    return new Money(negative ? -combined : combined, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minorUnits + other.minorUnits, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minorUnits - other.minorUnits, this.currency);
  }

  isNegative(): boolean {
    return this.minorUnits < 0n;
  }

  isZero(): boolean {
    return this.minorUnits === 0n;
  }

  /** Render as a fixed-decimal human string (e.g. "12.34"). */
  toDecimalString(): string {
    const decimals = CURRENCY_DECIMALS[this.currency];
    const negative = this.minorUnits < 0n;
    const abs = (negative ? -this.minorUnits : this.minorUnits).toString().padStart(decimals + 1, '0');
    const whole = abs.slice(0, abs.length - decimals) || '0';
    const fraction = decimals > 0 ? '.' + abs.slice(abs.length - decimals) : '';
    return `${negative ? '-' : ''}${whole}${fraction}`;
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }
}

/**
 * Convert an amount between currencies using a decimal exchange rate.
 * Returns the converted amount in the destination currency's minor units.
 */
export function convert(source: Money, rate: string | number, target: Currency): Money {
  const rateStr = typeof rate === 'number' ? rate.toString() : rate;
  // Scale the rate to a high-precision integer to avoid float math.
  const RATE_SCALE = 1_000_000n; // 6 decimal places of rate precision
  const [rWhole, rFraction = ''] = rateStr.split('.');
  const scaledRate = BigInt(`${rWhole}${(rFraction + '000000').slice(0, 6)}`);

  const sourceDecimals = CURRENCY_DECIMALS[source.currency];
  const targetDecimals = CURRENCY_DECIMALS[target];

  // value = source.minorUnits * rate, then re-scale for decimal differences.
  let result = source.minorUnits * scaledRate;
  const decimalDiff = targetDecimals - sourceDecimals;
  if (decimalDiff > 0) {
    result *= 10n ** BigInt(decimalDiff);
  } else if (decimalDiff < 0) {
    result /= 10n ** BigInt(-decimalDiff);
  }
  result /= RATE_SCALE;
  return Money.of(result, target);
}
