'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, Star, User, LogIn, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useStoreGate } from '@/store/store-gate.store';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  /** Pathname this tab highlights on — `href` without its query string. */
  match: string;
  label: string;
  Icon: React.ElementType;
}

// Logged out, the auth-gated tabs go straight to login carrying their return path
// (LoginForm honors ?redirect=), instead of landing on a guarded page just to be
// bounced back off its guard.
const ACCOUNT_HREF = '/account';
const FAVORITES_HREF = '/account/favorites';
const loginHref = (returnTo: string) => `/login?redirect=${encodeURIComponent(returnTo)}`;

// Sliding indicator width (px) — fixed so only translateX ever animates
// (compositor-only; no width animation, no scaleX corner distortion).
const INDICATOR_W = 28;

export function BottomNav() {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const storeGate = useStoreGate();

  // ── Sliding active-tab indicator (measured refs, physical coords) ──
  // getBoundingClientRect + physical left/translateX make RTL correct by
  // construction — the slide direction emerges from where tabs physically are,
  // never from index math (same principle as banning scrollLeft in the gallery).
  const navRef       = useRef<HTMLElement>(null);
  const tabRefs      = useRef<(HTMLAnchorElement | null)[]>([]);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const firstPaint   = useRef(true);

  const navItems: NavItem[] = [
    { href: '/',         match: '/',         label: 'الرئيسية', Icon: Home   },
    { href: '/listings', match: '/listings', label: 'البحث',    Icon: Search },
    // Favorites keeps its label/icon when logged out — it still advertises where
    // login lands you, and a second «دخول» tab would just be confusing. Its `match`
    // stays the real destination so only the account tab highlights on /login.
    {
      href:  isAuthenticated ? FAVORITES_HREF : loginHref(FAVORITES_HREF),
      match: FAVORITES_HREF,
      label: 'المفضلة',
      Icon:  Star,
    },
    isAuthenticated
      ? { href: ACCOUNT_HREF,             match: ACCOUNT_HREF, label: 'الحساب', Icon: User  }
      : { href: loginHref(ACCOUNT_HREF),  match: '/login',     label: 'دخول',   Icon: LogIn },
  ];

  const activeIndex = navItems.findIndex((it) => pathname === it.match);

  // Position the indicator under the active tab; hide it when no tab matches
  // (exact-match miss, e.g. a listing detail page) — a parked indicator lies.
  const position = () => {
    const nav = navRef.current, ind = indicatorRef.current;
    if (!nav || !ind) return;
    const tab = activeIndex === -1 ? null : tabRefs.current[activeIndex];
    if (!tab) { ind.style.opacity = '0'; return; }
    const navRect = nav.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    const x = tabRect.left - navRect.left + (tabRect.width - INDICATOR_W) / 2;
    if (firstPaint.current) {
      // First paint: place it silently — suppress the transition, apply, flush,
      // restore. No fly-in from x=0; opacity starts 0 in the markup (no
      // hydration flash) and fades in here.
      ind.style.transition = 'none';
      ind.style.transform = `translateX(${x}px)`;
      void ind.offsetWidth; // force reflow so the jump isn't animated
      ind.style.transition = '';
      firstPaint.current = false;
    } else {
      ind.style.transform = `translateX(${x}px)`;
    }
    ind.style.opacity = '1';
  };
  const positionRef = useRef(position);
  positionRef.current = position;

  // Before paint on every route/auth change — the glide (or first placement).
  useLayoutEffect(() => { positionRef.current(); }, [pathname, isAuthenticated]);

  // Rotation/resize + the Tajawal font-swap reflow (label widths shift tab
  // centers). Observing nav + each tab covers both; no window listeners.
  // Re-created on auth flip because the 4th tab remounts («الحساب» ↔ «دخول»).
  useEffect(() => {
    const ro = new ResizeObserver(() => positionRef.current());
    if (navRef.current) ro.observe(navRef.current);
    tabRefs.current.forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, [isAuthenticated]);

  if (pathname.startsWith('/m/')) return null;
  if (pathname.startsWith('/agent')) return null; // staff tool — uses its own in-panel tab bar
  if (pathname.startsWith('/accounting')) return null; // staff tool — no consumer chrome
  if (pathname.startsWith('/staff')) return null; // staff portal — no consumer chrome

  return (
    <nav ref={navRef} className="block md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/70 backdrop-blur-[20px] border-t border-gray-200/60 shadow-[0_-2px_12px_rgba(0,0,0,0.05)]">

      {/* Sliding active-tab indicator — a street lamp: blue bar (the housing)
          casting a warm-yellow cone down onto the active tab. The wrapper is the
          single moving object (translateX + opacity, positioned imperatively from
          measured rects); bar and beam ride it as children, so lamp + light glide,
          pass behind the FAB, and fade out as one. opacity-0 in SSR markup;
          position() fades it in after placing it. Springy overshoot curve; jumps
          instantly under prefers-reduced-motion (the beam stays — it's not motion).
          pointer-events-none is load-bearing: the 56×44px cone overlays the active
          tab's icon and must never eat its taps. */}
      <span
        ref={indicatorRef}
        aria-hidden
        className="absolute top-0 left-0 w-7 opacity-0 will-change-transform pointer-events-none transition-[transform,opacity] duration-[260ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"
      >
        {/* The bar/housing — blue, with the bulb-glow in the BEAM's amber (the
            housing emits yellow light, so its halo must be yellow, not blue). */}
        <span className="block w-7 h-[3px] rounded-full bg-blue-600 shadow-[0_2px_8px_rgba(252,211,77,0.5)]" />
        {/* The beam — trapezoid cone: top edge = the bar's 28px (25%→75% of the
            56px width), spreading to full width at the bottom (~20°/side), 44px
            tall. Amber-300 fades 0.45 → 0 by 92% height so the light dies before
            the label baseline; blur melts the clipped edges from vector-crisp to
            lamp-soft. */}
        <span className="absolute top-[3px] left-1/2 -translate-x-1/2 w-14 h-11 blur-[3px] [clip-path:polygon(25%_0,75%_0,100%_100%,0_100%)] bg-[linear-gradient(to_bottom,rgba(252,211,77,0.45),transparent_92%)]" />
      </span>

      <div className="flex items-end justify-around h-16 px-1">

        {/* Regular tabs — first two */}
        {navItems.slice(0, 2).map(({ href, match, label, Icon }, i) => (
          <Link
            key={href}
            href={href}
            ref={(el) => { tabRefs.current[i] = el; }}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors',
              pathname === match ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600',
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
          </Link>
        ))}

        {/* Add Ad — elevated center button. NOT in tabRefs — the indicator never
            lands here, it only glides behind. `relative` keeps this painting above
            the (positioned) indicator as it passes.
            Inert + grey for a business awaiting approval (the route enforces it). */}
        {storeGate.locked ? (
          <span
            aria-disabled
            title="قيد المراجعة — يُفتح بعد اعتماد حسابك"
            className="relative flex flex-col items-center gap-1 -mt-5 cursor-not-allowed select-none"
          >
            <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
              <Lock className="w-6 h-6 text-gray-400" />
            </div>
            <span className="text-[10px] font-semibold text-gray-400">قيد المراجعة</span>
          </span>
        ) : (
          <Link
            href="/listings/create"
            prefetch={false}
            className="relative flex flex-col items-center gap-1 -mt-5"
          >
            <div className="w-14 h-14 rounded-full bg-orange-500 shadow-[0_4px_14px] shadow-orange-500/45 flex items-center justify-center transition-transform active:scale-95">
              <PlusCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] font-semibold text-orange-500">أضف إعلان</span>
          </Link>
        )}

        {/* Regular tabs — last two */}
        {navItems.slice(2).map(({ href, match, label, Icon }, i) => (
          <Link
            key={href}
            href={href}
            ref={(el) => { tabRefs.current[i + 2] = el; }}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors',
              pathname === match ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600',
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
          </Link>
        ))}

      </div>
    </nav>
  );
}
