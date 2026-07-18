import { Injectable, Logger } from '@nestjs/common';
import type { FxRateProvider, LiveUsdNgnQuote } from './fx-rate.provider';

/**
 * Fetches live mid-market USD rates from open.er-api.com (no API key).
 * Docs: https://www.exchangerate-api.com/docs/free
 */
@Injectable()
export class OpenErApiProvider implements FxRateProvider {
  private readonly logger = new Logger(OpenErApiProvider.name);
  private readonly url =
    process.env.FX_API_URL ?? 'https://open.er-api.com/v6/latest/USD';

  async fetchUsdNgn(): Promise<LiveUsdNgnQuote> {
    const response = await fetch(this.url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      throw new Error(`FX provider HTTP ${response.status}`);
    }

    const body = (await response.json()) as {
      result?: string;
      rates?: Record<string, number>;
      time_last_update_utc?: string;
    };

    if (body.result && body.result !== 'success') {
      throw new Error(`FX provider result=${body.result}`);
    }

    const rate = body.rates?.NGN;
    if (!Number.isFinite(rate) || (rate as number) <= 0) {
      throw new Error('FX provider missing NGN rate');
    }

    const fetchedAt = body.time_last_update_utc
      ? new Date(body.time_last_update_utc)
      : new Date();

    this.logger.log(`Fetched live USDNGN=${rate}`);

    return {
      rate: Number(rate),
      source: 'open.er-api.com',
      fetchedAt: Number.isNaN(fetchedAt.getTime()) ? new Date() : fetchedAt,
    };
  }
}
