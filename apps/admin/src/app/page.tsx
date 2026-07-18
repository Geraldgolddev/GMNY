'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button, Input, Label } from '@gmny/ui';
import type { AuthResponse } from '@gmny/shared';
import { Role } from '@gmny/shared';
import { adminFetch } from '../lib/api';

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

      localStorage.setItem('gmny.admin.accessToken', auth.tokens.accessToken);
      router.push('/users');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900 p-8">
        <div className="mb-6 flex items-center gap-3">
          <Image src="/brand/gmny-logo.png" alt="GMNY" width={40} height={40} />
          <div>
            <h1 className="text-lg font-semibold">GMNY Admin</h1>
            <p className="text-sm text-slate-400">Operations console</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Admin email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
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
