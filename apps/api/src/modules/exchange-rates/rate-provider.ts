import { Currency } from '@gmny/shared';

/** Abstraction over a source of FX rates (internal desk, Circle, an oracle…). */
export interface RateProvider {
  /** Returns NGN per 1 USD as a decimal string. */
  getUsdToNgn(): Promise<string>;
}

export const RATE_PROVIDER = Symbol('RATE_PROVIDER');

/**
 * Default provider backed by a static desk rate. Swappable via DI for a live
 * feed without touching the service that consumes it.
 */
export class StaticRateProvider implements RateProvider {
  private readonly rates: Record<string, string> = {
    [`${Currency.USD}:${Currency.NGN}`]: '1600.50',
  };

  async getUsdToNgn(): Promise<string> {
    return this.rates[`${Currency.USD}:${Currency.NGN}`];
  }
}
