'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label } from '@gmny/ui';
import {
  QuoteDirection,
  type ExchangeRateView,
  type QuoteResponse,
} from '@gmny/shared';
import { AppShell } from '../../../components/app-shell';
import { api, getAccessToken } from '../../../lib/api';

export default function RatesPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [rate, setRate] = useState<ExchangeRateView | null>(null);
  const [direction, setDirection] = useState<QuoteDirection>(
    QuoteDirection.USD_TO_NGN,
  );
  const [amount, setAmount] = useState('100');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadRate = useCallback(async () => {
    const view = await api<ExchangeRateView>('/rates');
    setRate(view);
  }, []);

  useEffect(() => {
    const access = getAccessToken();
    if (!access) {
      router.replace('/login');
      return;
    }
    setToken(access);
    void loadRate().catch((err: Error) => setError(err.message));
  }, [router, loadRate]);

  useEffect(() => {
    if (!token) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setQuote(null);
      return;
    }

    const handle = setTimeout(() => {
      void api<QuoteResponse>('/rates/quote', {
        method: 'POST',
        token,
        body: JSON.stringify({ direction, amount: value }),
      })
        .then(setQuote)
        .catch(() => setQuote(null));
    }, 250);

    return () => clearTimeout(handle);
  }, [amount, direction, token]);

  async function refresh() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const view = await api<ExchangeRateView>('/rates/refresh', {
        method: 'POST',
        token,
      });
      setRate(view);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setBusy(false);
    }
  }

  const isUsdToNgn = direction === QuoteDirection.USD_TO_NGN;

  return (
    <AppShell title="Exchange rate">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)] p-6 shadow-[0_20px_60px_rgba(29,78,216,0.18)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium text-white">Live USD / NGN</h2>
              <p className="mt-1 text-sm text-[var(--gmny-muted)]">
                Mid-market rate cached in Postgres and refreshed when stale.
              </p>
            </div>
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => void refresh()}>
              {busy ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>

          {rate ? (
            <div className="mt-6">
              <p className="text-3xl font-semibold text-white">{rate.label}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between border-b border-white/5 py-2">
                  <dt className="text-[var(--gmny-muted)]">Source</dt>
                  <dd className="text-slate-100">{rate.source}</dd>
                </div>
                <div className="flex justify-between border-b border-white/5 py-2">
                  <dt className="text-[var(--gmny-muted)]">Fetched</dt>
                  <dd className="text-slate-100">
                    {new Date(rate.fetchedAt).toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-[var(--gmny-muted)]">Status</dt>
                  <dd className={rate.stale ? 'text-amber-300' : 'text-emerald-300'}>
                    {rate.stale ? 'Stale (will refresh soon)' : 'Fresh'}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="mt-6 text-sm text-[var(--gmny-muted)]">Loading rate…</p>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)] p-6 shadow-[0_20px_60px_rgba(29,78,216,0.18)]">
          <h2 className="text-lg font-medium text-white">Quote converter</h2>
          <p className="mt-1 text-sm text-[var(--gmny-muted)]">
            Preview USD→NGN and NGN→USD using the live/cached rate.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-black/30 p-1">
            <button
              type="button"
              onClick={() => setDirection(QuoteDirection.USD_TO_NGN)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                isUsdToNgn ? 'bg-[var(--gmny-blue-600)] text-white' : 'text-slate-300'
              }`}
            >
              USD → NGN
            </button>
            <button
              type="button"
              onClick={() => setDirection(QuoteDirection.NGN_TO_USD)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                !isUsdToNgn ? 'bg-[var(--gmny-blue-600)] text-white' : 'text-slate-300'
              }`}
            >
              NGN → USD
            </button>
          </div>

          <div className="mt-4">
            <Label htmlFor="amount">Amount ({isUsdToNgn ? 'USD' : 'NGN'})</Label>
            <Input
              id="amount"
              type="number"
              min={isUsdToNgn ? 1 : 100}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {quote && (
            <div className="mt-5 rounded-xl border border-[var(--gmny-border)] bg-black/20 p-4 text-sm">
              <p className="text-[var(--gmny-muted)]">Recipient gets</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {quote.destCurrency === 'USD' ? '$' : '₦'}
                {quote.destAmount.toLocaleString()}
              </p>
              <p className="mt-2 text-[var(--gmny-muted)]">
                Rate 1 USD = {quote.rate.toLocaleString()} NGN · {quote.source}
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
