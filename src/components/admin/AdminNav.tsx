'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutList, Megaphone, Zap, Store, Users, BadgeCheck, CalendarClock, Coins, ArrowLeftRight, UserPlus, Calculator } from 'lucide-react';

const LINKS = [
  { href: '/admin/listings',       label: 'إدارة الإعلانات',         icon: LayoutList     },
  { href: '/admin/advertisements', label: 'الإعلانات الدعائية',      icon: Megaphone      },
  { href: '/admin/dopings',        label: 'إدارة التمييز',           icon: Zap            },
  { href: '/admin/stores',         label: 'اعتماد المتاجر',          icon: Store          },
  { href: '/admin/users',          label: 'المستخدمون',              icon: Users          },
  { href: '/admin/memberships',    label: 'العضويات',                icon: BadgeCheck     },
  { href: '/admin/renewals',       label: 'التجديدات',               icon: CalendarClock  },
  { href: '/admin/commissions',    label: 'العمولات',                icon: Coins          },
  { href: '/admin/transfers',      label: 'اعتماد الحوالات',         icon: ArrowLeftRight },
  { href: '/admin/staff',          label: 'الموظفون',                icon: UserPlus       },
  { href: '/accounting',           label: 'المحاسبة',                icon: Calculator     },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    // flex-wrap + max-w-full: at 11 links the row overflows its container on anything
    // narrower than a wide desktop. w-fit resolves to min(max-content, available), so once
    // the links exceed the available width the row takes the full width and wraps instead
    // of running off the edge.
    <div className="flex flex-wrap gap-1 mb-6 bg-white shadow-pebble rounded-card p-1 w-fit max-w-full">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
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
