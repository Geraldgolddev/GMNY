'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@gmny/ui';
import {
  TransferStatus,
  type HistorySummary,
  type PaginatedResult,
  type TransferHistoryDetail,
  type TransferView,
} from '@gmny/shared';
import { AppShell } from '../../../components/app-shell';
import { api, getAccessToken } from '../../../lib/api';

const STATUS_FILTERS: Array<{ value: '' | TransferStatus; label: string }> = [
  { value: '', label: 'All' },
  { value: TransferStatus.COMPLETED, label: 'Completed' },
  { value: TransferStatus.PENDING, label: 'Pending' },
  { value: TransferStatus.PROCESSING, label: 'Processing' },
  { value: TransferStatus.FAILED, label: 'Failed' },
  { value: TransferStatus.CANCELLED, label: 'Cancelled' },
];

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function statusClass(status: TransferStatus) {
  switch (status) {
    case TransferStatus.COMPLETED:
      return 'text-emerald-300';
    case TransferStatus.FAILED:
      return 'text-red-300';
    case TransferStatus.CANCELLED:
      return 'text-slate-400';
    default:
      return 'text-amber-300';
  }
}

export default function HistoryPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'' | TransferStatus>('');
  const [list, setList] = useState<PaginatedResult<TransferView> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TransferHistoryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (access: string, nextPage: number, nextStatus: '' | TransferStatus) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          pageSize: '10',
        });
        if (nextStatus) params.set('status', nextStatus);

        const [nextSummary, nextList] = await Promise.all([
          api<HistorySummary>('/history/summary', { token: access }),
          api<PaginatedResult<TransferView>>(`/history?${params}`, {
            token: access,
          }),
        ]);
        setSummary(nextSummary);
        setList(nextList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const access = getAccessToken();
    if (!access) {
      router.replace('/login');
      return;
    }
    setToken(access);
    void load(access, page, status);
  }, [router, load, page, status]);

  async function openDetail(id: string) {
    if (!token) return;
    setSelectedId(id);
    setDetail(null);
    try {
      const row = await api<TransferHistoryDetail>(`/history/${id}`, {
        token,
      });
      setDetail(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load detail');
    }
  }

  return (
    <AppShell title="History">
      {error ? (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {summary ? (
        <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Sends" value={String(summary.transferCount)} />
          <Stat
            label="Completed"
            value={String(summary.completedCount)}
            hint={`${summary.failedCount} failed`}
          />
          <Stat label="Sent" value={money(summary.totalSentUsd, 'USD')} />
          <Stat
            label="Received (NGN)"
            value={money(summary.totalReceivedNgn, 'NGN')}
            hint={`Fees ${money(summary.totalFeesUsd, 'USD')}`}
          />
        </section>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            onClick={() => {
              setPage(1);
              setStatus(filter.value);
              setSelectedId(null);
              setDetail(null);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              status === filter.value
                ? 'bg-[var(--gmny-blue-600)] text-white'
                : 'bg-[rgba(37,99,235,0.12)] text-[var(--gmny-blue-300)] hover:bg-[rgba(37,99,235,0.2)]'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-white">Transfers</h2>
            {loading ? (
              <span className="text-xs text-[var(--gmny-muted)]">Loading…</span>
            ) : null}
          </div>

          {!list || list.items.length === 0 ? (
            <p className="text-sm text-[var(--gmny-muted)]">
              No transfers yet. Send money to see history here.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {list.items.map((item) => {
                const active = selectedId === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void openDetail(item.id)}
                      className={`flex w-full flex-col gap-1 px-2 py-3 text-left transition hover:bg-[rgba(37,99,235,0.08)] ${
                        active ? 'bg-[rgba(37,99,235,0.12)]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-100">
                            {item.recipient?.accountName ?? 'Recipient'}
                          </p>
                          <p className="text-xs text-[var(--gmny-muted)]">
                            {item.recipient?.bankName ?? '—'} ·{' '}
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-white">
                            {money(item.sourceAmount, 'USD')}
                          </p>
                          <p className={`text-xs ${statusClass(item.status)}`}>
                            {item.status}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-[var(--gmny-blue-300)]">
                        → {money(item.destAmount, 'NGN')}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {list && list.totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-[var(--gmny-muted)]">
                Page {list.page} of {list.totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= list.totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)] p-5">
          <h2 className="mb-4 text-lg font-medium text-white">Details</h2>
          {!detail ? (
            <p className="text-sm text-[var(--gmny-muted)]">
              Select a transfer to see FX, fees, and ledger lines.
            </p>
          ) : (
            <div className="space-y-4 text-sm">
              <dl className="space-y-2">
                <Row label="Status">
                  <span className={statusClass(detail.status)}>{detail.status}</span>
                </Row>
                <Row label="Sent">{money(detail.sourceAmount, 'USD')}</Row>
                <Row label="Fee">{money(detail.feeAmount, 'USD')}</Row>
                <Row label="FX rate">{detail.fxRate.toFixed(4)}</Row>
                <Row label="Received">{money(detail.destAmount, 'NGN')}</Row>
                <Row label="Settlement">{detail.settlementRef ?? '—'}</Row>
                <Row label="Chain">{detail.chain ?? '—'}</Row>
                <Row label="USDC">
                  {detail.usdcAmount != null
                    ? `${detail.usdcAmount.toFixed(2)} USDC`
                    : '—'}
                </Row>
                <Row label="Tx">
                  {detail.explorerUrl && detail.txHash ? (
                    <a
                      href={detail.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--gmny-blue-300)] hover:underline"
                    >
                      {detail.txHash.slice(0, 10)}…
                    </a>
                  ) : (
                    (detail.txHash ?? '—')
                  )}
                </Row>
                <Row label="Note">{detail.note ?? '—'}</Row>
              </dl>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gmny-blue-400)]">
                  Ledger
                </h3>
                <ul className="space-y-2">
                  {detail.ledger.map((line) => (
                    <li
                      key={line.id}
                      className="rounded-lg border border-white/5 bg-black/20 px-3 py-2"
                    >
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-200">{line.type}</span>
                        <span className="text-slate-100">
                          {money(line.amount, line.currency)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--gmny-muted)]">
                        {line.description}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--gmny-blue-400)]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-[var(--gmny-muted)]">{hint}</p> : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
      <dt className="text-[var(--gmny-muted)]">{label}</dt>
      <dd className="text-right text-slate-100">{children}</dd>
    </div>
  );
}
