/**
 * USDC on Base uses 6 decimals. These helpers convert between human decimal
 * strings and the base units used by ERC-20 transfers, using BigInt to avoid
 * floating-point error.
 */
export const USDC_DECIMALS = 6;

/** Convert a decimal USDC string (e.g. "12.5") to base units (BigInt). */
export function usdcToBaseUnits(amount: string): bigint {
  if (!/^\d+(\.\d+)?$/.test(amount.trim())) {
    throw new Error(`Invalid USDC amount: "${amount}"`);
  }
  const [whole, fraction = ''] = amount.trim().split('.');
  const paddedFraction = (fraction + '0'.repeat(USDC_DECIMALS)).slice(0, USDC_DECIMALS);
  return BigInt(`${whole}${paddedFraction}`);
}

/** Convert USDC base units (BigInt) to a human decimal string. */
export function baseUnitsToUsdc(units: bigint): string {
  const negative = units < 0n;
  const abs = (negative ? -units : units).toString().padStart(USDC_DECIMALS + 1, '0');
  const whole = abs.slice(0, abs.length - USDC_DECIMALS);
  const fraction = abs.slice(abs.length - USDC_DECIMALS);
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}
