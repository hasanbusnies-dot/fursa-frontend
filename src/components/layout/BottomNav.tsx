'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, Star, User, LogIn } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
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

export function BottomNav() {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (pathname.startsWith('/m/')) return null;
  if (pathname.startsWith('/agent')) return null; // staff tool — uses its own in-panel tab bar
  if (pathname.startsWith('/accounting')) return null; // staff tool — no consumer chrome
  if (pathname.startsWith('/staff')) return null; // staff portal — no consumer chrome

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

  return (
    <nav className="block md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/70 backdrop-blur-[20px] border-t border-gray-200/60 shadow-[0_-2px_12px_rgba(0,0,0,0.05)]">
      <div className="flex items-end justify-around h-16 px-1">

        {/* Regular tabs — first two */}
        {navItems.slice(0, 2).map(({ href, match, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors',
              pathname === match ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600',
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
          </Link>
        ))}

        {/* Add Ad — elevated center button */}
        <Link
          href="/listings/create"
          prefetch={false}
          className="flex flex-col items-center gap-1 -mt-5"
        >
          <div className="w-14 h-14 rounded-full bg-orange-500 shadow-[0_4px_14px] shadow-orange-500/45 flex items-center justify-center transition-transform active:scale-95">
            <PlusCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-[10px] font-semibold text-orange-500">أضف إعلان</span>
        </Link>

        {/* Regular tabs — last two */}
        {navItems.slice(2).map(({ href, match, label, Icon }) => (
          <Link
            key={href}
            href={href}
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
