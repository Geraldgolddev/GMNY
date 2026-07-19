import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';

const sans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' });

// Auth-gated client pages; skip static prerender (avoids dual-React useContext failures).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'GMNY — USD ↔ NGN',
  description: 'Simple USD to Naira and Naira to USD transfers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
