'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Receipt, ClipboardCheck, Banknote } from 'lucide-react';

const LINKS = [
  { href: '/accounting',              label: 'Genel Bakış',        icon: LayoutDashboard, exact: true },
  { href: '/accounting/pnl',          label: 'Kâr-Zarar',          icon: TrendingUp                    },
  { href: '/accounting/expenses',     label: 'Giderler',           icon: Receipt                       },
  { href: '/accounting/verification', label: 'Tahsilat Doğrulama', icon: ClipboardCheck                },
  { href: '/accounting/settlements',  label: 'Mutabakat',          icon: Banknote                      },
];

export function AccountingNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit overflow-x-auto max-w-full">
      {LINKS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : (pathname === href || pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
              active ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
