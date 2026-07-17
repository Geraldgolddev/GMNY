'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@gmny/ui';
import { api, ApiClientError } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setSent(true);
      setDevUrl(res.devActionUrl ?? null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-emerald-950 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot your password?</CardTitle>
          <CardDescription>We&apos;ll email you a link to reset it.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                If an account exists for <strong>{email}</strong>, a reset link has been sent.
              </p>
              {devUrl && (
                <p className="break-all rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Dev link:{' '}
                  <Link href={devUrl.replace(/^https?:\/\/[^/]+/, '')} className="font-semibold underline">
                    {devUrl}
                  </Link>
                </p>
              )}
              <Link href="/login" className="block text-center text-sm font-semibold text-emerald-700 underline">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
              <Link href="/login" className="block text-center text-sm text-emerald-700 underline">
                Back to login
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
