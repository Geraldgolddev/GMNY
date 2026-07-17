'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from '@nairaflow/ui';
import { api, type UserProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const router = useRouter();
  const { user, tokens, isLoading, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!tokens) {
      router.replace('/login');
      return;
    }
    api
      .me(tokens.accessToken)
      .then(setProfile)
      .catch(() => setError('Your session has expired. Please log in again.'));
  }, [isLoading, tokens, router]);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  if (isLoading || (!profile && !error)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-emerald-50 text-emerald-800">
        Loading your dashboard…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-emerald-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black">
            <span className="text-emerald-700">Naira</span>
            <span className="text-amber-500">Flow</span>
          </h1>
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        </div>

        {error ? (
          <Card>
            <CardContent className="p-6 text-red-700">{error}</CardContent>
          </Card>
        ) : profile ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Welcome, {profile.firstName} 👋</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Row label="Email" value={profile.email} />
                <Row
                  label="Role"
                  value={<Badge variant={profile.role === 'ADMIN' ? 'success' : 'default'}>{profile.role}</Badge>}
                />
                <Row
                  label="Account status"
                  value={<Badge variant="success">{profile.status}</Badge>}
                />
                <Row
                  label="KYC status"
                  value={
                    <Badge variant={profile.kycStatus === 'APPROVED' ? 'success' : 'warning'}>
                      {profile.kycStatus}
                    </Badge>
                  }
                />
                <Row label="Member since" value={new Date(profile.createdAt).toLocaleString()} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Send money to Nigeria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-emerald-700">
                  Transfers settle as USDC on Base and pay out in Naira. Transfer creation ships in
                  the next milestone — your account ({user?.email}) is ready.
                </p>
                <Button disabled>New transfer (coming soon)</Button>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-emerald-50 pb-2 last:border-0">
      <span className="text-sm text-emerald-600">{label}</span>
      <span className="text-sm font-medium text-emerald-950">{value}</span>
    </div>
  );
}
