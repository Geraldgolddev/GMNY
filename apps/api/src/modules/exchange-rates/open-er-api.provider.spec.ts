import { OpenErApiProvider } from './open-er-api.provider';

describe('OpenErApiProvider', () => {
  const provider = new OpenErApiProvider();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('parses NGN from a successful payload', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        result: 'success',
        rates: { NGN: 1625.4 },
        time_last_update_utc: 'Fri, 18 Jul 2026 00:00:00 +0000',
      }),
    } as Response);

    const quote = await provider.fetchUsdNgn();
    expect(quote.rate).toBe(1625.4);
    expect(quote.source).toBe('open.er-api.com');
  });

  it('throws when NGN is missing', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'success', rates: { EUR: 0.9 } }),
    } as Response);

    await expect(provider.fetchUsdNgn()).rejects.toThrow(/NGN/);
  });
});
