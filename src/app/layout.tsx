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
import { SplashScreen } from '@/components/providers/SplashScreen';

// Runs synchronously before the splash markup is parsed (top of <body>), so the
// data-splash attribute exists — or doesn't — before the browser paints anything.
// Once per tab-session: the flag is set immediately, so a reload mid-splash
// counts as shown. try/catch: sessionStorage can throw (private-mode quota) —
// then no attribute, no splash, app loads normally.
const SPLASH_INIT = `try{if(!sessionStorage.getItem('forsa-splash-shown')){document.documentElement.setAttribute('data-splash','');sessionStorage.setItem('forsa-splash-shown','1')}}catch(e){}`;

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
    // suppressHydrationWarning: scoped to THIS element's attributes only — the
    // splash init script intentionally sets data-splash on <html> before
    // hydration (pre-paint gating), which React would otherwise flag as an
    // SSR/client attribute mismatch. Same pattern as pre-hydration theme setters.
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${cairo.variable} ${tajawal.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-gray-50 font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: SPLASH_INIT }} />
        <SplashScreen />
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
