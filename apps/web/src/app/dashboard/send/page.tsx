'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label } from '@gmny/ui';
import {
  MIN_TRANSFER_USD,
  MAX_TRANSFER_USD,
  TRANSFER_FEE_RATE,
  type QuoteResponse,
  type Recipient,
  type TransferView,
  QuoteDirection,
} from '@gmny/shared';
import { AppShell } from '../../../components/app-shell';
import { api, getAccessToken } from '../../../lib/api';

export default function SendMoneyPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('100');
  const [note, setNote] = useState('');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [recent, setRecent] = useState<TransferView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fee = useMemo(() => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return Math.round(value * TRANSFER_FEE_RATE * 100) / 100;
  }, [amount]);

  const netUsd = useMemo(() => {
    const value = Number(amount);
    if (!Number.isFinite(value)) return 0;
    return Math.round((value - fee) * 100) / 100;
  }, [amount, fee]);

  const load = useCallback(async (access: string) => {
    const [recs, transfers] = await Promise.all([
      api<Recipient[]>('/recipients', { token: access }),
      api<TransferView[]>('/transfers', { token: access }),
    ]);
    setRecipients(recs);
    setRecent(transfers.slice(0, 5));
    const preferred =
      recs.find((r) => r.isDefault)?.id ?? recs[0]?.id ?? '';
    setRecipientId((current) => current || preferred);
  }, []);

  useEffect(() => {
    const access = getAccessToken();
    if (!access) {
      router.replace('/login');
      return;
    }
    setToken(access);
    void load(access).catch((err: Error) => setError(err.message));
  }, [router, load]);

  useEffect(() => {
    if (!token) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value < MIN_TRANSFER_USD) {
      setQuote(null);
      return;
    }
    const handle = setTimeout(() => {
      void api<QuoteResponse>('/rates/quote', {
        method: 'POST',
        token,
        body: JSON.stringify({
          direction: QuoteDirection.USD_TO_NGN,
          amount: value,
        }),
      })
        .then(setQuote)
        .catch(() => setQuote(null));
    }, 250);
    return () => clearTimeout(handle);
  }, [amount, token]);

  const payoutNgn = useMemo(() => {
    if (!quote) return null;
    return Math.round(netUsd * quote.rate * 100) / 100;
  }, [quote, netUsd]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    setOk(null);

    try {
      const transfer = await api<TransferView>('/transfers', {
        method: 'POST',
        token,
        body: JSON.stringify({
          recipientId,
          amountUsd: Number(amount),
          note: note || undefined,
          idempotencyKey:
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `web_${Date.now()}`,
        }),
      });
      setOk(
        `Sent $${transfer.sourceAmount.toLocaleString()} → ₦${transfer.destAmount.toLocaleString()} (${transfer.status})`,
      );
      setNote('');
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Send money">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)] p-6 shadow-[0_20px_60px_rgba(29,78,216,0.18)]">
          <h2 className="text-lg font-medium text-white">USD → Nigeria</h2>
          <p className="mt-1 text-sm text-[var(--gmny-muted)]">
            Send USD; recipient receives NGN at the locked live rate (fee{' '}
            {TRANSFER_FEE_RATE * 100}%).
          </p>

          {recipients.length === 0 ? (
            <p className="mt-6 text-sm text-amber-200">
              Add a recipient first under Recipients before sending.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <div>
                <Label htmlFor="recipientId">Recipient</Label>
                <select
                  id="recipientId"
                  required
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-[var(--gmny-border)] bg-[rgba(5,10,20,0.65)] px-3 text-sm text-[var(--gmny-ink)]"
                >
                  {recipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {(r.label || r.accountName) +
                        ` · ${r.bankName} · ${r.accountNumber}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="amount">You send (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={MIN_TRANSFER_USD}
                  max={MAX_TRANSFER_USD}
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <p className="mt-1 text-xs text-[var(--gmny-muted)]">
                  Min ${MIN_TRANSFER_USD} · Max ${MAX_TRANSFER_USD.toLocaleString()}
                </p>
              </div>

              <div>
                <Label htmlFor="note">Note (optional)</Label>
                <Input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Family support"
                />
              </div>

              {quote && payoutNgn !== null && (
                <div className="rounded-xl border border-[var(--gmny-border)] bg-black/20 p-4 text-sm text-slate-100">
                  <p>
                    Fee: <strong>${fee.toLocaleString()}</strong>
                  </p>
                  <p className="mt-1">
                    Converted: <strong>${netUsd.toLocaleString()}</strong>
                  </p>
                  <p className="mt-2 text-lg">
                    Recipient gets:{' '}
                    <strong className="text-white">
                      ₦{payoutNgn.toLocaleString()}
                    </strong>
                  </p>
                  <p className="mt-1 text-[var(--gmny-muted)]">
                    Rate 1 USD = {quote.rate.toLocaleString()} NGN · {quote.source}
                  </p>
                </div>
              )}

              {error && (
                <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </p>
              )}
              {ok && (
                <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {ok}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || !recipientId || !quote}
              >
                {loading ? 'Sending…' : 'Send now'}
              </Button>
            </form>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)] p-6 shadow-[0_20px_60px_rgba(29,78,216,0.18)]">
          <h2 className="text-lg font-medium text-white">Recent sends</h2>
          <ul className="mt-5 space-y-3">
            {recent.length === 0 && (
              <li className="text-sm text-[var(--gmny-muted)]">No transfers yet.</li>
            )}
            {recent.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-white">
                    ${t.sourceAmount.toLocaleString()} → ₦
                    {t.destAmount.toLocaleString()}
                  </p>
                  <span className="text-xs text-emerald-300">{t.status}</span>
                </div>
                <p className="mt-1 text-[var(--gmny-muted)]">
                  {t.recipient?.accountName ?? 'Recipient'} ·{' '}
                  {t.recipient?.bankName ?? ''}
                </p>
                <p className="mt-1 text-xs text-[var(--gmny-muted)]">
                  {new Date(t.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
