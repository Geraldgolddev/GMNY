import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';

const sans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' });

// Admin pages are auth-gated client apps; skip static prerender.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'GMNY Admin',
  description: 'GMNY operations and compliance console',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
