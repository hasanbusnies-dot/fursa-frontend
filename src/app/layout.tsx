import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { MobileTopBar } from '@/components/layout/MobileTopBar';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { StaffRouteLock } from '@/components/layout/StaffRouteLock';
import { SocketManager } from '@/components/providers/SocketManager';

// App-wide UI face. Cairo is a modern Kufi-style Arabic sans — clean, widely
// used for Arabic UI — and also carries Latin glyphs so brand names, codes, and
// numerals stay in the same family. Self-hosted via next/font — no layout shift.
// Cairo is a variable font, so omitting `weight` exposes its full weight axis.
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-arabic',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Forsa | Syria's Classifieds Platform",
    template: '%s | Forsa',
  },
  description: "Buy, sell, and find opportunities on Forsa — Syria's leading classifieds platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-gray-50 font-sans antialiased">
        <SocketManager />
        <StaffRouteLock />
        <Header />
        <MobileTopBar />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <Footer />
        <BottomNav />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
