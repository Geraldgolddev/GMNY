'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@gmny/ui';
import type { NotificationUnreadCount } from '@gmny/shared';
import { api, clearAuth, getAccessToken, getRefreshToken } from '../lib/api';

const nav = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/send', label: 'Send' },
  { href: '/dashboard/history', label: 'History' },
  { href: '/dashboard/wallet', label: 'Wallet' },
  { href: '/dashboard/notifications', label: 'Alerts' },
  { href: '/dashboard/recipients', label: 'Recipients' },
  { href: '/dashboard/rates', label: 'Rates' },
];

export function AppShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    void api<NotificationUnreadCount>('/notifications/unread-count', { token })
      .then((res) => setUnread(res.unreadCount))
      .catch(() => setUnread(0));
  }, [pathname]);

  async function logout() {
    const token = getAccessToken();
    const refreshToken = getRefreshToken();
    try {
      if (token) {
        await api('/auth/logout', {
          method: 'POST',
          token,
          body: JSON.stringify(refreshToken ? { refreshToken } : {}),
        });
      }
    } finally {
      clearAuth();
      router.replace('/login');
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 md:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/gmny-logo.png"
            alt="GMNY"
            width={44}
            height={44}
            className="drop-shadow-[0_8px_24px_rgba(59,130,246,0.45)]"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gmny-blue-400)]">
              GMNY
            </p>
            <h1 className="text-xl font-semibold text-white">{title}</h1>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {nav.map((item) => {
            const active =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);
            const showBadge =
              item.href === '/dashboard/notifications' && unread > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-[var(--gmny-blue-600)] text-white'
                    : 'text-[var(--gmny-blue-300)] hover:bg-[rgba(37,99,235,0.12)]'
                }`}
              >
                {item.label}
                {showBadge ? (
                  <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-white/15 px-1 text-[10px] font-semibold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                ) : null}
              </Link>
            );
          })}
          <Button variant="secondary" onClick={() => void logout()}>
            Sign out
          </Button>
        </nav>
      </header>
      {children}
    </div>
  );
}
