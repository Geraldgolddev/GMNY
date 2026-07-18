'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@gmny/ui';
import type { NotificationListResult, NotificationView } from '@gmny/shared';
import { AppShell } from '../../../components/app-shell';
import { api, getAccessToken } from '../../../lib/api';

export default function NotificationsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<NotificationListResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (access: string) => {
    const next = await api<NotificationListResult>('/notifications', {
      token: access,
    });
    setData(next);
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

  async function markRead(id: string) {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await api<NotificationView>(`/notifications/${id}/read`, {
        method: 'PATCH',
        token,
      });
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark read');
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await api('/notifications/read-all', { method: 'POST', token });
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all read');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Notifications">
      {error ? (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium text-white">Inbox</h2>
            <p className="mt-1 text-sm text-[var(--gmny-muted)]">
              {data
                ? `${data.unreadCount} unread · transfer and wallet updates`
                : 'Loading…'}
            </p>
          </div>
          <Button
            variant="secondary"
            disabled={loading || !data || data.unreadCount === 0}
            onClick={() => void markAllRead()}
          >
            Mark all read
          </Button>
        </div>

        {!data || data.items.length === 0 ? (
          <p className="text-sm text-[var(--gmny-muted)]">
            No notifications yet. Send money or create a wallet to see updates here.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {data.items.map((item) => {
              const unread = !item.readAt;
              return (
                <li key={item.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {unread ? (
                        <span className="h-2 w-2 rounded-full bg-[var(--gmny-blue-400)]" />
                      ) : null}
                      <p className="font-medium text-slate-100">{item.title}</p>
                    </div>
                    <p className="mt-1 text-sm text-[var(--gmny-muted)]">{item.body}</p>
                    <p className="mt-2 text-xs text-[var(--gmny-blue-300)]">
                      {item.type} · {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {unread ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={loading}
                      onClick={() => void markRead(item.id)}
                    >
                      Mark read
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
