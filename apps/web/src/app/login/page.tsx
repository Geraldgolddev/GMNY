import Image from 'next/image';
import Link from 'next/link';
import { AuthForm } from '../../components/auth-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)] p-8 shadow-[0_24px_80px_rgba(29,78,216,0.25)] backdrop-blur">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/brand/gmny-logo.png"
            alt="GMNY"
            width={64}
            height={64}
            className="drop-shadow-[0_12px_32px_rgba(59,130,246,0.45)]"
          />
          <h1 className="mt-3 text-xl font-semibold text-white">Sign in to GMNY</h1>
        </div>
        <AuthForm mode="login" />
        <p className="mt-5 text-center text-sm text-[var(--gmny-muted)]">
          New here?{' '}
          <Link className="text-[var(--gmny-blue-400)] hover:text-[var(--gmny-blue-300)]" href="/register">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
