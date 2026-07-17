'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@nairaflow/ui';
import { api, ApiClientError } from '@/lib/api';

type Status = 'verifying' | 'success' | 'error';

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }
    api
      .verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('Your email has been verified. You can now use all NairaFlow features.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(
          err instanceof ApiClientError ? err.message : 'Verification failed. The link may have expired.',
        );
      });
  }, [token]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          {status === 'verifying' && 'Verifying your email…'}
          {status === 'success' && 'Email verified 🎉'}
          {status === 'error' && 'Verification problem'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p
          className={
            status === 'error'
              ? 'rounded-md bg-red-50 px-3 py-2 text-sm text-red-700'
              : 'text-sm text-emerald-700'
          }
        >
          {message || 'Please wait…'}
        </p>
        <div className="flex gap-3">
          <Link href="/dashboard">
            <Button>Go to dashboard</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline">Log in</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-emerald-950 px-4 py-12">
      <Suspense fallback={<p className="text-white">Loading…</p>}>
        <VerifyEmailInner />
      </Suspense>
    </main>
  );
}
