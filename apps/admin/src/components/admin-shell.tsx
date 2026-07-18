'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Button } from '@gmny/ui';
import { clearAdminAuth, getAdminUser } from '../lib/api';

const nav = [
  { href: '/overview', label: 'Overview' },
  { href: '/users', label: 'Users' },
  { href: '/transfers', label: 'Transfers' },
  { href: '/audit', label: 'Audit' },
];

export function AdminShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getAdminUser();

  function logout() {
    clearAdminAuth();
    router.replace('/');
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 md:px-6">
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
              GMNY Admin
            </p>
            <h1 className="text-xl font-semibold text-white">{title}</h1>
            {user ? (
              <p className="text-xs text-[var(--gmny-muted)]">{user.email}</p>
            ) : null}
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-[var(--gmny-blue-600)] text-white'
                    : 'text-[var(--gmny-blue-300)] hover:bg-[rgba(37,99,235,0.12)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Button variant="secondary" onClick={logout}>
            Sign out
          </Button>
        </nav>
      </header>
      {children}
    </div>
  );
}
