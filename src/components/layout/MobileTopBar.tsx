'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { create } from 'zustand';
import { useSmartBack } from '@/lib/navigation';

// ── Top-bar store ─────────────────────────────────────────────────────────────
// Lets dynamic pages (listing detail, category) override what the shared bar
// shows: its title and an optional slot of page actions.
//
// The bar's COLOUR is deliberately not in here. It was briefly a per-page `tone`,
// set to brand blue by the listing detail page alone; that made the app's chrome
// change colour as you navigated, which reads as two different apps rather than
// one. Blue is now the bar, everywhere it appears (founder's call, 2026-08-10) —
// so there is no tone to pass and no way for a page to get it wrong.

interface BarState {
  title: string | null;
  /** Rendered at the inline-END of the bar (the LEFT side in RTL). */
  actions: ReactNode | null;
  /**
   * Where back goes when this tab has no in-app history (a deep link). Pages
   * that know their own context supply it — a listing its category, a category
   * its parent crumb — because the URL alone cannot produce it. Null falls back
   * to the structural default below.
   */
  back: string | null;
}
interface MobileTopBarState extends BarState {
  setBar: (s: BarState) => void;
}
const useMobileTitleStore = create<MobileTopBarState>((set) => ({
  title: null,
  actions: null,
  back: null,
  setBar: (s) => set(s),
}));

const RESET: BarState = { title: null, actions: null, back: null };

/**
 * Set the mobile top-bar title for the current page (cleared on unmount).
 *
 * `back` is the deep-link fallback described on BarState — pass it whenever the
 * page can name a better destination than the URL's parent.
 */
export function useMobileTitle(title: string | null | undefined, back?: string | null) {
  const setBar = useMobileTitleStore((s) => s.setBar);
  useEffect(() => {
    setBar({ ...RESET, title: title && title.trim() ? title : null, back: back ?? null });
    return () => setBar(RESET);
  }, [title, back, setBar]);
}

/**
 * Full control of the shared bar for one page: its title and an actions slot.
 *
 * `actions` is a ReactNode held in the store, so the CALLER must memoise it —
 * an inline JSX literal is a new object every render and would loop this effect.
 * Anything put there renders ON BLUE: give it white or white-ringed treatments,
 * never a dark-on-light control.
 */
export function useMobileTopBar(opts: {
  title?: string | null;
  actions?: ReactNode | null;
  back?: string | null;
}) {
  const { title = null, actions = null, back = null } = opts;
  const setBar = useMobileTitleStore((s) => s.setBar);
  useEffect(() => {
    setBar({ title: title && title.trim() ? title : null, actions, back });
    return () => setBar(RESET);
  }, [title, actions, back, setBar]);
}

// ── Route config ────────────────────────────────────────────────────────────────

// Roots (no back bar) — mirror the BottomNav destinations.
const ROOT_PATHS = new Set<string>(['/', '/listings', '/account', '/account/favorites']);
// Pages that manage their own chrome / should never show the bar.
const HIDE_EXACT = new Set<string>(['/login', '/register', '/listings/create']);
const HIDE_PREFIXES = ['/m/', '/agent', '/accounting', '/staff'];

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

// Deep-link fallbacks for routes where stripping the last URL segment lands
// nowhere real — or lands somewhere the user has never been.
//
// Notifications and messages are the second kind. Both are opened from the
// header, on EVERY page, so their structural parent (/account) is a dashboard
// the visitor never passed through. Home is the honest answer when there is no
// history to return to (founder's call, 2026-08-14).
const FALLBACK_OVERRIDES: Record<string, string> = {
  '/account/notifications':          '/',
  '/account/messages':               '/',
  '/messages':                       '/',
  '/compare':                        '/',
  '/account/offers/seller':          '/account',
  '/account/offers/buyer':           '/account',
  '/account/secure-payment/buying':  '/account',
  '/account/secure-payment/selling': '/account',
};

/**
 * Where back goes on this route when the tab has no in-app history AND the page
 * itself named no better destination (see BarState.back).
 *
 * Structural, and that is its limit: a listing's category cannot be recovered
 * from `/listings/<id>`, which is exactly why pages can override it.
 */
function defaultFallback(pathname: string): string {
  if (FALLBACK_OVERRIDES[pathname]) return FALLBACK_OVERRIDES[pathname];
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
  const ctxTitle = useMobileTitleStore((s) => s.title);
  const actions  = useMobileTitleStore((s) => s.actions);
  const ctxBack  = useMobileTitleStore((s) => s.back);

  // Real history first, the page's own context second, the URL's parent last.
  const goBack = useSmartBack(ctxBack ?? defaultFallback(pathname));

  if (!shouldShowMobileTopBar(pathname)) return null;

  const title = ctxTitle ?? ROUTE_TITLES[pathname] ?? fallbackTitle(pathname);

  return (
    // Solid brand blue on EVERY inner page — the bar is app chrome, so it looks the
    // same wherever you are rather than changing colour as you navigate.
    // Deliberately not the glass treatment the Header uses: a translucent blue bar
    // picks up whatever scrolls under it, and the whole point of a solid bar is
    // that it stays put. white/15 for the back button's hover — a grey hover would
    // be invisible here.
    <div className="md:hidden sticky top-0 z-40 bg-blue-600 border-b border-blue-700/40 shadow-sm">
      <div className="flex items-center gap-2 h-14 px-3">
        <button
          type="button"
          // Resolved on click (not during render): sessionStorage is read there, so
          // there is nothing storage-dependent in the server/first-client markup.
          onClick={goBack}
          aria-label="رجوع"
          className="shrink-0 p-1.5 -ms-1.5 rounded-lg text-white hover:bg-white/15 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <h1 className="flex-1 min-w-0 truncate text-base font-bold text-white">
          {title}
        </h1>
        {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
