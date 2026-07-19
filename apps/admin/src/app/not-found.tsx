import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold text-white">Page not found</h1>
      <p className="text-sm text-[var(--gmny-muted)]">
        That admin route does not exist.
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-[var(--gmny-blue-300)] hover:underline"
      >
        Back to login
      </Link>
    </div>
  );
}
