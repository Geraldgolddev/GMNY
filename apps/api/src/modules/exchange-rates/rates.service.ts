import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Prisma } from '@gmny/database';
import {
  QuoteDirection,
  type ExchangeRateView,
  type QuoteResponse,
} from '@gmny/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { FX_RATE_PROVIDER, type FxRateProvider } from './fx-rate.provider';

const PAIR = 'USDNGN';
const STALE_MS = 15 * 60 * 1000;
const FALLBACK_RATE = 1600;

@Injectable()
export class RatesService implements OnModuleInit {
  private readonly logger = new Logger(RatesService.name);
  private refreshInFlight: Promise<ExchangeRateView> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(FX_RATE_PROVIDER) private readonly fx: FxRateProvider,
  ) {}

  async onModuleInit() {
    try {
      await this.refresh(true);
    } catch (error) {
      this.logger.warn(
        `Live FX bootstrap failed; ensuring fallback rate exists (${String(error)})`,
      );
      await this.ensureFallback();
    }
  }

  async getCurrent(options: { refreshIfStale?: boolean } = {}): Promise<ExchangeRateView> {
    const refreshIfStale = options.refreshIfStale ?? true;
    const cached = await this.prisma.exchangeRate.findUnique({ where: { pair: PAIR } });

    if (!cached) {
      return this.refresh(true);
    }

    const view = this.toView(cached);
    if (refreshIfStale && view.stale) {
      try {
        return await this.refresh(false);
      } catch (error) {
        this.logger.warn(`Stale refresh failed; serving cache (${String(error)})`);
        return view;
      }
    }

    return view;
  }

  async refresh(force: boolean): Promise<ExchangeRateView> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = this.doRefresh(force).finally(() => {
      this.refreshInFlight = null;
    });

    return this.refreshInFlight;
  }

  async quote(direction: QuoteDirection, amount: number): Promise<QuoteResponse> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Amount must be a positive number',
      });
    }

    if (
      direction !== QuoteDirection.USD_TO_NGN &&
      direction !== QuoteDirection.NGN_TO_USD
    ) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'direction must be USD_TO_NGN or NGN_TO_USD',
      });
    }

    const current = await this.getCurrent({ refreshIfStale: true });
    const rate = current.rate;

    if (direction === QuoteDirection.USD_TO_NGN) {
      if (amount < 1) {
        throw new BadRequestException({
          error: 'VALIDATION_ERROR',
          message: 'Minimum USD amount is 1',
        });
      }
      return {
        direction,
        sourceCurrency: 'USD',
        destCurrency: 'NGN',
        sourceAmount: round(amount, 2),
        destAmount: round(amount * rate, 2),
        rate,
        fetchedAt: current.fetchedAt,
        source: current.source,
      };
    }

    if (amount < 100) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Minimum NGN amount is 100',
      });
    }

    return {
      direction,
      sourceCurrency: 'NGN',
      destCurrency: 'USD',
      sourceAmount: round(amount, 2),
      destAmount: round(amount / rate, 2),
      rate,
      fetchedAt: current.fetchedAt,
      source: current.source,
    };
  }

  private async doRefresh(_force: boolean): Promise<ExchangeRateView> {
    try {
      const live = await this.fx.fetchUsdNgn();
      const row = await this.prisma.exchangeRate.upsert({
        where: { pair: PAIR },
        update: {
          rate: new Prisma.Decimal(live.rate.toFixed(6)),
          source: live.source,
          fetchedAt: live.fetchedAt,
          baseCurrency: 'USD',
          quoteCurrency: 'NGN',
        },
        create: {
          pair: PAIR,
          baseCurrency: 'USD',
          quoteCurrency: 'NGN',
          rate: new Prisma.Decimal(live.rate.toFixed(6)),
          source: live.source,
          fetchedAt: live.fetchedAt,
        },
      });
      return this.toView(row);
    } catch (error) {
      const cached = await this.prisma.exchangeRate.findUnique({ where: { pair: PAIR } });
      if (cached) {
        this.logger.warn(`Live FX failed; using cache (${String(error)})`);
        return this.toView(cached);
      }
      throw new ServiceUnavailableException({
        error: 'FX_UNAVAILABLE',
        message: 'Live exchange rate unavailable and no cache exists',
      });
    }
  }

  private async ensureFallback() {
    await this.prisma.exchangeRate.upsert({
      where: { pair: PAIR },
      update: {},
      create: {
        pair: PAIR,
        baseCurrency: 'USD',
        quoteCurrency: 'NGN',
        rate: new Prisma.Decimal(FALLBACK_RATE.toFixed(6)),
        source: 'gmny-fallback',
        fetchedAt: new Date(0),
      },
    });
  }

  private toView(row: {
    pair: string;
    baseCurrency: string;
    quoteCurrency: string;
    rate: Prisma.Decimal | number | string;
    source: string;
    fetchedAt: Date;
  }): ExchangeRateView {
    const rate = Number(row.rate);
    const fetchedAt = row.fetchedAt;
    const stale = Date.now() - fetchedAt.getTime() > STALE_MS;

    return {
      pair: 'USDNGN',
      baseCurrency: 'USD',
      quoteCurrency: 'NGN',
      rate,
      source: row.source,
      fetchedAt: fetchedAt.toISOString(),
      stale,
      label: `1 USD = ${rate.toLocaleString(undefined, { maximumFractionDigits: 2 })} NGN`,
    };
  }
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
