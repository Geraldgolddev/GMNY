'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminTransferListResult } from '@gmny/shared';
import { TransferStatus } from '@gmny/shared';
import { AdminShell } from '../../components/admin-shell';
import { adminFetch, getAdminAccessToken } from '../../lib/api';

const filters: Array<{ value: '' | TransferStatus; label: string }> = [
  { value: '', label: 'All' },
  { value: TransferStatus.COMPLETED, label: 'Completed' },
  { value: TransferStatus.PROCESSING, label: 'Processing' },
  { value: TransferStatus.FAILED, label: 'Failed' },
  { value: TransferStatus.PENDING, label: 'Pending' },
];

export default function AdminTransfersPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'' | TransferStatus>('');
  const [data, setData] = useState<AdminTransferListResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (token: string, nextStatus: '' | TransferStatus) => {
    const params = new URLSearchParams({ page: '1', pageSize: '50' });
    if (nextStatus) params.set('status', nextStatus);
    const next = await adminFetch<AdminTransferListResult>(
      `/admin/transfers?${params}`,
      { token },
    );
    setData(next);
  }, []);

  useEffect(() => {
    const token = getAdminAccessToken();
    if (!token) {
      router.replace('/');
      return;
    }
    void load(token, status).catch((err: Error) => setError(err.message));
  }, [router, load, status]);

  return (
    <AdminShell title="Transfers">
      {error ? (
        <p className="mb-4 text-sm text-red-300">{error}</p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.label}
            type="button"
            onClick={() => setStatus(filter.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              status === filter.value
                ? 'bg-[var(--gmny-blue-600)] text-white'
                : 'bg-[rgba(37,99,235,0.12)] text-[var(--gmny-blue-300)]'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <section className="overflow-x-auto rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-[var(--gmny-muted)]">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Settlement</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(data?.items ?? []).map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 text-slate-200">{row.userEmail}</td>
                <td className="px-4 py-3 text-slate-200">{row.recipientName}</td>
                <td className="px-4 py-3 text-slate-100">
                  ${row.sourceAmount.toFixed(2)}
                  <span className="block text-xs text-[var(--gmny-muted)]">
                    → ₦{row.destAmount.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-200">{row.status}</td>
                <td className="px-4 py-3 text-xs text-[var(--gmny-muted)]">
                  {row.settlementProvider}
                  {row.txHash ? (
                    <span className="mt-1 block font-mono">
                      {row.txHash.slice(0, 12)}…
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-[var(--gmny-muted)]">
                  {new Date(row.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.items.length ? (
          <p className="px-4 py-6 text-sm text-[var(--gmny-muted)]">No transfers yet.</p>
        ) : null}
      </section>
    </AdminShell>
  );
}
