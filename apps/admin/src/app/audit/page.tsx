'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminAuditView } from '@gmny/shared';
import { AdminShell } from '../../components/admin-shell';
import { adminFetch, getAdminAccessToken } from '../../lib/api';

export default function AdminAuditPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AdminAuditView[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAdminAccessToken();
    if (!token) {
      router.replace('/');
      return;
    }
    void adminFetch<AdminAuditView[]>('/admin/audit?limit=50', { token })
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, [router]);

  return (
    <AdminShell title="Audit">
      {error ? (
        <p className="mb-4 text-sm text-red-300">{error}</p>
      ) : null}

      <section className="overflow-x-auto rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-[var(--gmny-muted)]">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 text-[var(--gmny-muted)]">
                  {new Date(row.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-slate-200">
                  {row.actorEmail ?? '—'}
                </td>
                <td className="px-4 py-3 text-slate-100">{row.action}</td>
                <td className="px-4 py-3 text-xs text-[var(--gmny-muted)]">
                  {row.entityType}
                  {row.entityId ? ` · ${row.entityId.slice(0, 8)}…` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? (
          <p className="px-4 py-6 text-sm text-[var(--gmny-muted)]">No audit events yet.</p>
        ) : null}
      </section>
    </AdminShell>
  );
}
