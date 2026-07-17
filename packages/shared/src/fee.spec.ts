import { computeFee, buildQuote } from './fee';
import { Currency } from './enums';

describe('computeFee', () => {
  it('applies 1.5% + $0.30 flat', () => {
    // $100.00 => 1.50 + 0.30 = $1.80 => 180 cents
    expect(computeFee(10_000n)).toBe(180n);
  });

  it('is just the flat fee for tiny amounts', () => {
    // $1.00 => 0.015 -> floors to 1 cent + 30 = 31 cents
    expect(computeFee(100n)).toBe(31n);
  });
});

describe('buildQuote', () => {
  it('deducts fee then converts USD -> NGN', () => {
    // $100.00, fee $1.80, send $98.20 at 1600.50 => 157,169.10 NGN
    const q = buildQuote(10_000n, '1600.50', Currency.USD, Currency.NGN);
    expect(q.feeMinor).toBe(180n);
    expect(q.sendAmountMinor).toBe(9_820n);
    expect(q.destAmountMinor).toBe(15_716_910n); // 157169.10 NGN in kobo
    expect(q.rate).toBe('1600.50');
  });

  it('throws when the amount cannot cover the fee', () => {
    expect(() => buildQuote(10n, '1600.50', Currency.USD, Currency.NGN)).toThrow(/cover the transfer fee/);
  });
});
