'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@gmny/ui';
import type { AdminUserListResult, AdminUserView } from '@gmny/shared';
import { AdminShell } from '../../components/admin-shell';
import { adminFetch, getAdminAccessToken } from '../../lib/api';

export default function AdminUsersPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [data, setData] = useState<AdminUserListResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (access: string, query: string) => {
    const params = new URLSearchParams({ page: '1', pageSize: '50' });
    if (query.trim()) params.set('q', query.trim());
    const next = await adminFetch<AdminUserListResult>(
      `/admin/users?${params}`,
      { token: access },
    );
    setData(next);
  }, []);

  useEffect(() => {
    const access = getAdminAccessToken();
    if (!access) {
      router.replace('/');
      return;
    }
    setToken(access);
    void load(access, '').catch((err: Error) => setError(err.message));
  }, [router, load]);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await load(token, q);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(user: AdminUserView) {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await adminFetch(`/admin/users/${user.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      await load(token, q);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell title="Users">
      {error ? (
        <p className="mb-4 text-sm text-red-300">{error}</p>
      ) : null}

      <form onSubmit={onSearch} className="mb-4 flex flex-wrap gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email or name"
          className="max-w-sm"
        />
        <Button type="submit" variant="secondary" disabled={loading}>
          Search
        </Button>
      </form>

      <section className="overflow-x-auto rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-[var(--gmny-muted)]">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Sends</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(data?.items ?? []).map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-100">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-[var(--gmny-muted)]">{user.email}</p>
                </td>
                <td className="px-4 py-3 text-slate-200">{user.role}</td>
                <td className="px-4 py-3">
                  <span className={user.isActive ? 'text-emerald-300' : 'text-red-300'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-200">{user.transferCount}</td>
                <td className="px-4 py-3 text-[var(--gmny-muted)]">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={loading}
                    onClick={() => void toggleActive(user)}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.items.length ? (
          <p className="px-4 py-6 text-sm text-[var(--gmny-muted)]">No users found.</p>
        ) : null}
      </section>
    </AdminShell>
  );
}
