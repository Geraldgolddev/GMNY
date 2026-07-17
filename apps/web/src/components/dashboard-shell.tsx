'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@nairaflow/ui';
import { useAuth } from '@/lib/auth-context';

/** Authenticated dashboard chrome: top bar with brand, user, and logout. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-emerald-50">
      <header className="border-b border-emerald-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <span className="text-xl font-black">
            <span className="text-emerald-700">Naira</span>
            <span className="text-amber-500">Flow</span>
          </span>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-emerald-700 sm:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
