'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutList, Megaphone, Zap } from 'lucide-react';

const LINKS = [
  { href: '/admin/listings',       label: 'İlan Yönetimi',   icon: LayoutList },
  { href: '/admin/advertisements', label: 'Reklam Yönetimi', icon: Megaphone  },
  { href: '/admin/dopings',        label: 'Doping Yönetimi', icon: Zap        },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit">
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
