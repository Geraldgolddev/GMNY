import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@gmny/ui';

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/gmny-logo.png"
            alt="GMNY"
            width={44}
            height={44}
            priority
            className="h-11 w-11 object-contain"
          />
          <span className="text-lg font-semibold tracking-[0.18em] text-white">
            GMNY
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-white">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button>Get started</Button>
          </Link>
        </div>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-10 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage:
              'radial-gradient(ellipse at center, black 20%, transparent 75%)',
          }}
        />

        <Image
          src="/brand/gmny-logo.png"
          alt=""
          width={160}
          height={160}
          priority
          className="mb-8 h-36 w-36 object-contain drop-shadow-[0_20px_60px_rgba(37,99,235,0.45)] motion-safe:animate-[pulse_4s_ease-in-out_infinite]"
        />

        <h1
          className="max-w-3xl text-5xl leading-tight text-white md:text-7xl"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Move dollars. Deliver naira.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 md:text-lg">
          GMNY settles USD as USDC on Base and pays out directly to Nigerian bank
          accounts — built for speed, compliance, and trust.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/register">
            <Button size="lg">Create account</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="secondary">
              I already have an account
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
