import { usdcToBaseUnits, baseUnitsToUsdc } from './usdc';

describe('USDC conversions', () => {
  it('converts decimal strings to 6-decimal base units', () => {
    expect(usdcToBaseUnits('1')).toBe(1_000_000n);
    expect(usdcToBaseUnits('12.5')).toBe(12_500_000n);
    expect(usdcToBaseUnits('0.000001')).toBe(1n);
  });

  it('round-trips base units back to decimal strings', () => {
    expect(baseUnitsToUsdc(1_000_000n)).toBe('1.000000');
    expect(baseUnitsToUsdc(12_500_000n)).toBe('12.500000');
  });

  it('rejects malformed amounts', () => {
    expect(() => usdcToBaseUnits('1.2.3')).toThrow(/Invalid USDC/);
  });
});
