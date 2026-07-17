import Link from 'next/link';
import { ArrowRight, ShieldCheck, Zap, Globe } from 'lucide-react';
import { Button } from '@nairaflow/ui';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight">
            <span className="text-emerald-400">Naira</span>
            <span className="text-amber-400">Flow</span>
          </span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-white hover:bg-emerald-800">
              Log in
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="secondary">Get started</Button>
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <span className="inline-block rounded-full bg-emerald-800/60 px-4 py-1 text-sm font-medium text-emerald-200">
          Powered by USDC on Base
        </span>
        <h1 className="mt-6 text-5xl font-black leading-tight tracking-tight sm:text-6xl">
          Send Dollars.
          <br />
          <span className="text-amber-400">Receive Naira. Instantly.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-emerald-100">
          NairaFlow settles your USD as USDC on Base and delivers Nigerian Naira directly to a
          recipient&apos;s bank account — secure, transparent, and fast.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="gap-2">
              Create an account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-emerald-800">
              I already have an account
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 sm:grid-cols-3">
        {[
          { icon: Zap, title: 'Instant settlement', body: 'On-chain USDC rails settle in seconds, not days.' },
          { icon: ShieldCheck, title: 'Security first', body: 'JWT auth, RBAC, audit logs, and KYC-ready compliance.' },
          { icon: Globe, title: 'Real payouts', body: 'Naira delivered straight to Nigerian bank accounts.' },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl bg-emerald-800/40 p-6 backdrop-blur">
            <Icon className="h-8 w-8 text-amber-400" />
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-emerald-100">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
