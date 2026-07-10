'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HandCoins, ReceiptText, Store, PlusCircle, CalendarClock, LogOut, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

// Calmer staff palette (slate/teal) — deliberately distinct from the consumer orange
// shopping UI so field agents know they're in the staff tool.

const TABS = [
  { href: '/agent/collect',         label: 'تحصيل',      Icon: HandCoins     },
  { href: '/agent/collections',     label: 'سجل التحصيل', Icon: ReceiptText   },
  { href: '/agent/stores/register', label: 'متجر جديد',  Icon: PlusCircle    },
  { href: '/agent/stores',          label: 'متاجري',     Icon: Store         },
  { href: '/agent/renewals',        label: 'التجديدات',  Icon: CalendarClock },
] as const;

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // /agent/login manages its own access (it's how you get in) — never gate or shell it.
  const isLoginRoute = pathname === '/agent/login';

  const isAgent = isAuthenticated && user?.userType === 'FIELD_AGENT';

  // Auth + role guard. Wait for hydration (auth lives in localStorage) so we don't
  // bounce a logged-in agent on first paint.
  useEffect(() => {
    if (!mounted || isLoginRoute) return;
    if (!isAgent) router.replace('/agent/login');
  }, [mounted, isLoginRoute, isAgent, router]);

  // The login route renders bare (no shell, no guard).
  if (isLoginRoute) return <>{children}</>;

  // Until hydrated / confirmed, render nothing so child pages never flash to non-agents.
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }
  if (!isAgent) return null;

  const agentName = user?.profile?.firstName ?? 'المندوب';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col" dir="rtl">

      {/* Staff top bar */}
      <header className="sticky top-0 z-40 bg-slate-900/85 backdrop-blur-[20px] text-white">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
              <HandCoins className="w-4 h-4 text-teal-300" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-bold truncate">لوحة المندوب</p>
              <p className="text-[11px] text-slate-400 truncate">{agentName}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.replace('/agent/login'); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
            خروج
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-5 pb-24">
        {children}
      </main>

      {/* In-panel bottom tab bar — thumb reach for field use on phones */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-lg mx-auto flex items-stretch h-16">
          {/* Single active tab = the longest href that prefixes the current path. Avoids
              both "/agent/stores" and "/agent/stores/register" lighting up at once. */}
          {(() => {
            const activeHref = TABS
              .filter((t) => pathname === t.href || pathname.startsWith(t.href + '/'))
              .reduce<string | null>((best, t) => (!best || t.href.length > best.length ? t.href : best), null);
            return TABS.map(({ href, label, Icon }) => {
            const active = href === activeHref;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-1 transition-colors',
                  active ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600',
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-semibold">{label}</span>
              </Link>
            );
          });
          })()}
        </div>
      </nav>
    </div>
  );
}
