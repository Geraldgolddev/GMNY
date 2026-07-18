'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminOverview } from '@gmny/shared';
import { AdminShell } from '../../components/admin-shell';
import { adminFetch, getAdminAccessToken } from '../../lib/api';

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAdminAccessToken();
    if (!token) {
      router.replace('/');
      return;
    }
    void adminFetch<AdminOverview>('/admin/overview', { token })
      .then(setData)
      .catch((err: Error) => {
        setError(err.message);
        if (err.message.toLowerCase().includes('admin')) {
          router.replace('/');
        }
      });
  }, [router]);

  return (
    <AdminShell title="Overview">
      {error ? (
        <p className="mb-4 text-sm text-red-300">{error}</p>
      ) : null}
      {!data ? (
        <p className="text-sm text-[var(--gmny-muted)]">Loading platform metrics…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Users" value={String(data.users.total)} hint={`${data.users.active} active · ${data.users.admins} admins`} />
          <Stat label="Transfers" value={String(data.transfers.total)} hint={`${data.transfers.completed} completed · ${data.transfers.failed} failed`} />
          <Stat label="Volume (USD)" value={money(data.transfers.volumeUsd, 'USD')} hint={money(data.transfers.volumeNgn, 'NGN')} />
          <Stat label="Wallets" value={String(data.wallets.total)} hint={`${data.notifications.unreadInApp} unread alerts`} />
        </div>
      )}
    </AdminShell>
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
    <div className="rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)] px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--gmny-blue-400)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--gmny-muted)]">{hint}</p> : null}
    </div>
  );
}
