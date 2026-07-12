import type { Metadata, Viewport } from 'next';
import { Cairo, Tajawal } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { MobileTopBar } from '@/components/layout/MobileTopBar';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { StaffRouteLock } from '@/components/layout/StaffRouteLock';
import { SocketManager } from '@/components/providers/SocketManager';
import { PushPrompt } from '@/components/providers/PushPrompt';

// Dual-font strategy per the Stitch DESIGN.md: Cairo (geometric Kufi-style)
// for headings, Tajawal for body text/labels. Both carry Latin glyphs so brand
// names, codes, and numerals stay in-family. Self-hosted via next/font — no
// layout shift. Cairo is a variable font (full weight axis); Tajawal is not,
// so its weights are pinned.
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-arabic',
});

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  variable: '--font-body',
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
  // PNG favicons complement src/app/favicon.ico (multi-size .ico generated from
  // the same public/forsa-logo-*.png set); modern browsers prefer the PNGs.
  icons: {
    icon: [
      { url: '/forsa-logo-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/forsa-logo-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/forsa-logo-180.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${tajawal.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-gray-50 font-sans antialiased">
        <SocketManager />
        <PushPrompt />
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
