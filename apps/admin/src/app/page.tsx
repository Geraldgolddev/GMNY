'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button, Input, Label } from '@gmny/ui';
import type { AuthResponse } from '@gmny/shared';
import { Role } from '@gmny/shared';
import { adminFetch, saveAdminAuth } from '../lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      const auth = await adminFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: String(form.get('email') ?? ''),
          password: String(form.get('password') ?? ''),
        }),
      });

      if (auth.user.role !== Role.ADMIN) {
        throw new Error('Admin role required');
      }

      saveAdminAuth(auth);
      router.push('/overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)] p-8 shadow-[0_20px_60px_rgba(29,78,216,0.18)]">
        <div className="mb-6 flex items-center gap-3">
          <Image src="/brand/gmny-logo.png" alt="GMNY" width={44} height={44} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gmny-blue-400)]">
              GMNY
            </p>
            <h1 className="text-lg font-semibold text-white">Admin console</h1>
            <p className="text-sm text-[var(--gmny-muted)]">Operations &amp; compliance</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Admin email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              defaultValue="admin@gmny.com"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
