'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, Star, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/',                  label: 'الرئيسية', Icon: Home  },
  { href: '/listings',          label: 'البحث',    Icon: Search },
  { href: '/account/favorites', label: 'المفضلة',  Icon: Star  },
  { href: '/account',           label: 'الحساب',   Icon: User  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith('/m/')) return null;

  return (
    <nav className="block md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.07)]">
      <div className="flex items-end justify-around h-16 px-1">

        {/* Regular tabs — first two */}
        {NAV_ITEMS.slice(0, 2).map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors',
              pathname === href ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600',
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}

        {/* Add Ad — elevated center button */}
        <Link
          href="/listings/create"
          className="flex flex-col items-center gap-1 -mt-5"
        >
          <div className="w-14 h-14 rounded-full bg-orange-500 shadow-[0_4px_14px_rgba(249,115,22,0.45)] flex items-center justify-center transition-transform active:scale-95">
            <PlusCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-[10px] font-semibold text-orange-500">أضف إعلان</span>
        </Link>

        {/* Regular tabs — last two */}
        {NAV_ITEMS.slice(2).map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors',
              pathname === href ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600',
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}

      </div>
    </nav>
  );
}
