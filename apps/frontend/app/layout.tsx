// path: apps/frontend/app/layout.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { geistSans, geistMono } from './fonts';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'DriveCare',
  description: 'DriveCare — invoices & payments',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="min-h-screen bg-midnight-glow">
          <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-white/30 bg-white/50 dark:bg-black/30 border-b border-cloud/60">
            <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
              <Link className="font-semibold tracking-tight" href="/">DriveCare</Link>
              <nav className="flex items-center gap-5 text-sm">
                <Link className="hover:underline" href="/invoices">Счета</Link>
                <Link className="hover:underline" href="/tariffs">Тарифы</Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        </div>
        <ToastProvider />
      </body>
    </html>
  );
}
