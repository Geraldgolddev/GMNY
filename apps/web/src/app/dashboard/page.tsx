'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@gmny/ui';
import { api, type SessionInfo, type UserProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Protected } from '@/components/protected';
import { DashboardShell } from '@/components/dashboard-shell';

function DashboardContent() {
  const { user, accessToken } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendUrl, setResendUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    const [p, s] = await Promise.all([api.me(accessToken), api.sessions(accessToken)]);
    setProfile(p);
    setSessions(s);
  }, [accessToken]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function resend() {
    if (!accessToken) return;
    const res = await api.resendVerification(accessToken);
    setResendMsg(res.message);
    setResendUrl(res.devActionUrl ?? null);
  }

  // Prefer the freshly-fetched profile so verification state is current after
  // navigating back from the verify-email page (no full reload needed).
  const verified = profile ? Boolean(profile.emailVerifiedAt) : Boolean(user?.emailVerified);

  return (
    <div className="space-y-6">
      {user && !verified && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-amber-900">Verify your email</p>
              <p className="text-sm text-amber-800">
                We sent a verification link to {user.email}. Verify to unlock transfers.
              </p>
              {resendMsg && <p className="mt-1 text-xs text-amber-700">{resendMsg}</p>}
              {resendUrl && (
                <a href={resendUrl.replace(/^https?:\/\/[^/]+/, '')} className="text-xs font-semibold text-amber-900 underline">
                  Open verification link (dev)
                </a>
              )}
            </div>
            <Button variant="secondary" size="sm" onClick={resend}>
              Resend email
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Welcome, {profile?.firstName ?? user?.firstName} 👋</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row label="Email" value={profile?.email ?? user?.email ?? ''} />
          <Row
            label="Email verified"
            value={
              <Badge variant={verified ? 'success' : 'warning'}>
                {verified ? 'VERIFIED' : 'UNVERIFIED'}
              </Badge>
            }
          />
          <Row
            label="Role"
            value={<Badge variant={user?.role === 'ADMIN' ? 'success' : 'default'}>{user?.role}</Badge>}
          />
          <Row
            label="Account status"
            value={<Badge variant="success">{profile?.status ?? user?.status}</Badge>}
          />
          {profile && (
            <Row label="Member since" value={new Date(profile.createdAt).toLocaleString()} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active sessions ({sessions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between border-b border-emerald-50 pb-2 text-sm last:border-0"
              >
                <span className="text-emerald-800">
                  {s.userAgent?.slice(0, 40) ?? 'Unknown device'} · {s.ipAddress ?? 'n/a'}
                </span>
                {s.current ? (
                  <Badge variant="success">This device</Badge>
                ) : (
                  <Badge variant="muted">Other</Badge>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
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

export default function DashboardPage() {
  return (
    <Protected>
      <DashboardShell>
        <DashboardContent />
      </DashboardShell>
    </Protected>
  );
}
