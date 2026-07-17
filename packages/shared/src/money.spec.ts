import { Money, convert } from './money';
import { Currency } from './enums';

describe('Money', () => {
  it('parses USD decimal strings into cents', () => {
    expect(Money.fromDecimal('12.34', Currency.USD).minorUnits).toBe(1234n);
    expect(Money.fromDecimal('0.05', Currency.USD).minorUnits).toBe(5n);
    expect(Money.fromDecimal('100', Currency.USD).minorUnits).toBe(10000n);
  });

  it('parses USDC with 6 decimals', () => {
    expect(Money.fromDecimal('1.5', Currency.USDC).minorUnits).toBe(1_500_000n);
  });

  it('renders minor units back to decimal strings', () => {
    expect(Money.of(1234n, Currency.USD).toDecimalString()).toBe('12.34');
    expect(Money.of(5n, Currency.USD).toDecimalString()).toBe('0.05');
    expect(Money.of(1_500_000n, Currency.USDC).toDecimalString()).toBe('1.500000');
  });

  it('adds and subtracts within the same currency', () => {
    const a = Money.fromDecimal('10.00', Currency.USD);
    const b = Money.fromDecimal('2.50', Currency.USD);
    expect(a.add(b).toDecimalString()).toBe('12.50');
    expect(a.subtract(b).toDecimalString()).toBe('7.50');
  });

  it('rejects operations across currencies', () => {
    const usd = Money.fromDecimal('1', Currency.USD);
    const ngn = Money.fromDecimal('1', Currency.NGN);
    expect(() => usd.add(ngn)).toThrow(/Currency mismatch/);
  });

  it('rejects invalid decimal input', () => {
    expect(() => Money.fromDecimal('abc', Currency.USD)).toThrow(/Invalid decimal/);
  });

  it('handles negative amounts', () => {
    const m = Money.fromDecimal('-3.21', Currency.USD);
    expect(m.isNegative()).toBe(true);
    expect(m.toDecimalString()).toBe('-3.21');
  });
});

describe('convert', () => {
  it('converts USD to NGN using a decimal rate', () => {
    // 100.00 USD at 1600.50 NGN/USD => 160050.00 NGN
    const usd = Money.fromDecimal('100.00', Currency.USD);
    const ngn = convert(usd, '1600.50', Currency.NGN);
    expect(ngn.currency).toBe(Currency.NGN);
    expect(ngn.toDecimalString()).toBe('160050.00');
  });

  it('converts USD to USDC accounting for decimal difference', () => {
    // 10.00 USD at 1:1 => 10.000000 USDC
    const usd = Money.fromDecimal('10.00', Currency.USD);
    const usdc = convert(usd, '1', Currency.USDC);
    expect(usdc.toDecimalString()).toBe('10.000000');
  });
});
