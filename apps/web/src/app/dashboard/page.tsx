'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@gmny/ui';
import type { DashboardOverview, ExchangeRateView } from '@gmny/shared';
import { AppShell } from '../../components/app-shell';
import { api, getAccessToken } from '../../lib/api';

function formatAction(action: string): string {
  switch (action) {
    case 'USER_REGISTERED':
      return 'Account created';
    case 'USER_LOGIN':
      return 'Signed in';
    case 'USER_LOGOUT':
      return 'Signed out';
    case 'TOKEN_REFRESHED':
      return 'Session refreshed';
    default:
      return action;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [rate, setRate] = useState<ExchangeRateView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    void Promise.all([
      api<DashboardOverview>('/dashboard/overview', { token }),
      api<ExchangeRateView>('/rates'),
    ])
      .then(([overview, fx]) => {
        setData(overview);
        setRate(fx);
      })
      .catch((err: Error) => {
        setError(err.message);
        if (err.message.toLowerCase().includes('token')) {
          router.replace('/login');
        }
      });
  }, [router]);

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-300">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--gmny-muted)]">
        Loading dashboard…
      </div>
    );
  }

  const { user, account, security } = data;

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)] p-6 shadow-[0_20px_60px_rgba(29,78,216,0.18)]">
          <h2 className="text-lg font-medium text-white">Welcome back</h2>
          <p className="mt-1 text-sm text-[var(--gmny-muted)]">
            {user.firstName} {user.lastName}
          </p>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
              <dt className="text-[var(--gmny-muted)]">Email</dt>
              <dd className="text-right text-slate-100">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
              <dt className="text-[var(--gmny-muted)]">Role</dt>
              <dd className="text-right text-slate-100">{account.role}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
              <dt className="text-[var(--gmny-muted)]">Status</dt>
              <dd className="text-right text-emerald-300">
                {account.isActive ? 'Active' : 'Inactive'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
              <dt className="text-[var(--gmny-muted)]">Last login</dt>
              <dd className="text-right text-slate-100">
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleString()
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--gmny-muted)]">Member since</dt>
              <dd className="text-right text-slate-100">
                {new Date(account.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)] p-6 shadow-[0_20px_60px_rgba(29,78,216,0.18)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium text-white">USD / NGN rate</h2>
              <p className="mt-1 text-sm text-[var(--gmny-muted)]">
                Live mid-market rate used for quotes.
              </p>
            </div>
            <Link href="/dashboard/rates">
              <Button size="sm" variant="secondary">
                Open
              </Button>
            </Link>
          </div>
          {rate ? (
            <div className="mt-5">
              <p className="text-2xl font-semibold text-white">{rate.label}</p>
              <p className="mt-2 text-sm text-[var(--gmny-muted)]">
                {rate.source} · {rate.stale ? 'Stale' : 'Fresh'} ·{' '}
                {new Date(rate.fetchedAt).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="mt-5 text-sm text-[var(--gmny-muted)]">Loading rate…</p>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)] p-6 shadow-[0_20px_60px_rgba(29,78,216,0.18)] md:col-span-2">
          <h2 className="text-lg font-medium text-white">Security activity</h2>
          <p className="mt-1 text-sm text-[var(--gmny-muted)]">
            Recent authentication events from your account audit log.
          </p>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {security.recentEvents.length === 0 && (
              <li className="text-sm text-[var(--gmny-muted)]">No events yet.</li>
            )}
            {security.recentEvents.map((event) => (
              <li
                key={event.id}
                className="rounded-xl border border-white/5 bg-black/20 px-3 py-3 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-100">
                    {formatAction(event.action)}
                  </span>
                  <span className="text-xs text-[var(--gmny-muted)]">
                    {new Date(event.createdAt).toLocaleString()}
                  </span>
                </div>
                {event.ipAddress ? (
                  <p className="mt-1 text-xs text-[var(--gmny-muted)]">
                    IP {event.ipAddress}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
