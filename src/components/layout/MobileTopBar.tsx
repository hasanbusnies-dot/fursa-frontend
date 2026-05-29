'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { create } from 'zustand';

// ── Title store ───────────────────────────────────────────────────────────────
// Lets dynamic pages (listing detail, category) override the resolved title.
interface MobileTitleState {
  title: string | null;
  setTitle: (t: string | null) => void;
}
const useMobileTitleStore = create<MobileTitleState>((set) => ({
  title: null,
  setTitle: (title) => set({ title }),
}));

/** Set the mobile top-bar title for the current page (cleared on unmount). */
export function useMobileTitle(title: string | null | undefined) {
  const setTitle = useMobileTitleStore((s) => s.setTitle);
  useEffect(() => {
    setTitle(title && title.trim() ? title : null);
    return () => setTitle(null);
  }, [title, setTitle]);
}

// ── Route config ────────────────────────────────────────────────────────────────

// Roots (no back bar) — mirror the BottomNav destinations.
const ROOT_PATHS = new Set<string>(['/', '/listings', '/account', '/account/favorites']);
// Pages that manage their own chrome / should never show the bar.
const HIDE_EXACT = new Set<string>(['/login', '/register', '/listings/create']);
const HIDE_PREFIXES = ['/m/'];

/**
 * True when the mobile back bar should appear on this route. Shared with the
 * Header so it can hide its mobile presentation on the same (inner) pages.
 * Mobile-only visibility itself is handled with `md:hidden` in the markup.
 */
export function shouldShowMobileTopBar(pathname: string): boolean {
  if (HIDE_EXACT.has(pathname)) return false;
  if (HIDE_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  if (ROOT_PATHS.has(pathname)) return false;
  return true;
}

// Static inner-route titles.
const ROUTE_TITLES: Record<string, string> = {
  '/account/listings':               'إعلاناتي',
  '/account/listings/inactive':      'إعلاناتي غير النشطة',
  '/account/saved-searches':         'عمليات البحث المفضلة',
  '/account/favorite-sellers':       'البائعون المفضلون',
  '/account/messages':               'رسائلي',
  '/account/questions':              'أسئلة وأجوبة',
  '/account/offers/seller':          'عروض منتجاتي',
  '/account/offers/buyer':           'عروض الشراء',
  '/account/secure-payment/buying':  'عمليات الشراء',
  '/account/secure-payment/selling': 'عمليات البيع',
  '/messages':                       'الرسائل',
  '/compare':                        'المقارنة',
  '/category/real-estate/projects':  'مشاريع سكنية',
};

// Parent overrides where stripping the last segment wouldn't land on a real page.
const PARENT_OVERRIDES: Record<string, string> = {
  '/messages':                       '/',
  '/compare':                        '/',
  '/account/offers/seller':          '/account',
  '/account/offers/buyer':           '/account',
  '/account/secure-payment/buying':  '/account',
  '/account/secure-payment/selling': '/account',
};

function parentOf(pathname: string): string {
  if (PARENT_OVERRIDES[pathname]) return PARENT_OVERRIDES[pathname];
  if (pathname.startsWith('/listings/edit/')) return '/account/listings';
  const segs = pathname.split('/').filter(Boolean);
  segs.pop();
  const parent = '/' + segs.join('/');
  if (parent === '/category') return '/'; // category catch-all has no bare root page
  return parent;
}

function fallbackTitle(pathname: string): string {
  if (pathname.startsWith('/listings/edit/'))    return 'تعديل الإعلان';
  if (pathname.startsWith('/listings/'))         return 'تفاصيل الإعلان';
  if (pathname.startsWith('/category/'))         return 'الفئة';
  if (pathname.startsWith('/account/messages/')) return 'المحادثة';
  return '';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MobileTopBar() {
  const pathname = usePathname();
  const router   = useRouter();
  const ctxTitle = useMobileTitleStore((s) => s.title);

  if (!shouldShowMobileTopBar(pathname)) return null;

  const title = ctxTitle ?? ROUTE_TITLES[pathname] ?? fallbackTitle(pathname);

  return (
    <div className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center gap-2 h-14 px-3">
        <button
          type="button"
          onClick={() => router.push(parentOf(pathname))}
          aria-label="رجوع"
          className="shrink-0 p-1.5 -ms-1.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <h1 className="flex-1 min-w-0 truncate text-base font-bold text-gray-900">
          {title}
        </h1>
      </div>
    </div>
  );
}
