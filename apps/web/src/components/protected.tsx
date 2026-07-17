'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/**
 * Client-side route guard. While the session is hydrating (via the refresh
 * cookie) it shows a loader; unauthenticated users are redirected to /login.
 */
export function Protected({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-emerald-50 text-emerald-800">
        Loading your session…
      </main>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
