'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label } from '@gmny/ui';
import type { AuthResponse } from '@gmny/shared';
import { api, saveAuth } from '../lib/api';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload =
      mode === 'login'
        ? {
            email: String(form.get('email')),
            password: String(form.get('password')),
          }
        : {
            email: String(form.get('email')),
            password: String(form.get('password')),
            firstName: String(form.get('firstName')),
            lastName: String(form.get('lastName')),
          };

    try {
      const auth = await api<AuthResponse>(
        mode === 'login' ? '/auth/login' : '/auth/register',
        { method: 'POST', body: JSON.stringify(payload) },
      );
      saveAuth(auth);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === 'register' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" name="firstName" required autoComplete="given-name" />
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" name="lastName" required autoComplete="family-name" />
          </div>
        </div>
      )}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={12}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          placeholder={mode === 'register' ? '12+ chars, mixed case, number, symbol' : undefined}
        />
      </div>
      {error && (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
      </Button>
    </form>
  );
}
