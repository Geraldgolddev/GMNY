'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@gmny/ui';
import { api, type AdminUserRow } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, tokens, isLoading, logout } = useAuth();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!tokens) {
      router.replace('/login');
      return;
    }
    api
      .listUsers(tokens.accessToken)
      .then((res) => {
        setRows(res.data);
        setTotal(res.meta.total);
      })
      .catch(() => setError('Unable to load users. Ensure you are signed in as an admin.'));
  }, [isLoading, tokens, router]);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-emerald-800">Loading…</main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">
              <span className="text-emerald-700">GM</span>
              <span className="text-amber-500">NY</span> Admin
            </h1>
            <p className="text-sm text-emerald-600">Signed in as {user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users ({total})</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-red-700">{error}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-emerald-100 text-emerald-500">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Role</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">KYC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((u) => (
                      <tr key={u.id} className="border-b border-emerald-50">
                        <td className="py-2 pr-4 font-medium text-emerald-950">
                          {u.firstName} {u.lastName}
                        </td>
                        <td className="py-2 pr-4">{u.email}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={u.role === 'ADMIN' ? 'success' : 'default'}>{u.role}</Badge>
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant="muted">{u.status}</Badge>
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant={u.kycStatus === 'APPROVED' ? 'success' : 'warning'}>
                            {u.kycStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
