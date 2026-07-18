import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@gmny/ui';

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(96,165,250,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.12) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at center, black 15%, transparent 72%)',
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/gmny-logo.png"
            alt="GMNY"
            width={48}
            height={48}
            priority
            className="h-12 w-12 object-contain drop-shadow-[0_8px_24px_rgba(59,130,246,0.55)]"
          />
          <span className="text-lg font-semibold tracking-[0.22em] text-[var(--gmny-blue-300)]">
            GMNY
          </span>
        </div>
        <div className="flex gap-3">
          <Link href="/login">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link href="/register">
            <Button>Get started</Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <Image
          src="/brand/gmny-logo.png"
          alt=""
          width={168}
          height={168}
          priority
          className="mb-8 h-40 w-40 object-contain drop-shadow-[0_24px_70px_rgba(37,99,235,0.55)] motion-safe:animate-[pulse_5s_ease-in-out_infinite]"
        />
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gmny-blue-400)]">
          GMNY
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white md:text-6xl">
          Cross-border payments, built on trust.
        </h1>
        <p className="mt-5 max-w-xl text-base text-slate-300 md:text-lg">
          Send USD from the United States. Settle in USDC on Base. Deliver Naira to Nigerian bank
          accounts.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/register">
            <Button size="lg">Create account</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="secondary">
              Sign in
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
