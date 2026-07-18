import { BadRequestException } from '@nestjs/common';
import { QuoteDirection } from '@gmny/shared';
import { RatesService } from './rates.service';

describe('RatesService', () => {
  const prisma = {
    exchangeRate: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const fx = {
    fetchUsdNgn: jest.fn(),
  };

  const service = new RatesService(prisma as never, fx as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns cached rate when fresh', async () => {
    prisma.exchangeRate.findUnique.mockResolvedValue({
      pair: 'USDNGN',
      baseCurrency: 'USD',
      quoteCurrency: 'NGN',
      rate: 1550.25,
      source: 'open.er-api.com',
      fetchedAt: new Date(),
    });

    const view = await service.getCurrent({ refreshIfStale: true });
    expect(view.rate).toBe(1550.25);
    expect(view.stale).toBe(false);
    expect(fx.fetchUsdNgn).not.toHaveBeenCalled();
  });

  it('refreshes when stale', async () => {
    prisma.exchangeRate.findUnique.mockResolvedValue({
      pair: 'USDNGN',
      baseCurrency: 'USD',
      quoteCurrency: 'NGN',
      rate: 1500,
      source: 'open.er-api.com',
      fetchedAt: new Date(Date.now() - 60 * 60 * 1000),
    });
    fx.fetchUsdNgn.mockResolvedValue({
      rate: 1601.5,
      source: 'open.er-api.com',
      fetchedAt: new Date(),
    });
    prisma.exchangeRate.upsert.mockResolvedValue({
      pair: 'USDNGN',
      baseCurrency: 'USD',
      quoteCurrency: 'NGN',
      rate: 1601.5,
      source: 'open.er-api.com',
      fetchedAt: new Date(),
    });

    const view = await service.getCurrent({ refreshIfStale: true });
    expect(view.rate).toBe(1601.5);
    expect(fx.fetchUsdNgn).toHaveBeenCalled();
  });

  it('quotes USD to NGN', async () => {
    prisma.exchangeRate.findUnique.mockResolvedValue({
      pair: 'USDNGN',
      baseCurrency: 'USD',
      quoteCurrency: 'NGN',
      rate: 1600,
      source: 'test',
      fetchedAt: new Date(),
    });

    const quote = await service.quote(QuoteDirection.USD_TO_NGN, 100);
    expect(quote.destAmount).toBe(160000);
    expect(quote.destCurrency).toBe('NGN');
  });

  it('rejects invalid quote amounts', async () => {
    await expect(service.quote(QuoteDirection.USD_TO_NGN, 0)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
