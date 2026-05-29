'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FileText, Star, Bookmark, UserCheck,
  MessageSquare, HelpCircle, ShoppingCart, Shield, CreditCard,
  Wallet, Bell, Car, Settings, ChevronDown, ChevronUp,
} from 'lucide-react';

// ── Nav definition ─────────────────────────────────────────────────────────────

type NavGrandchild = { href: string; label: string };
type NavChild = { href?: string; label: string; children?: NavGrandchild[] };

type NavItem = {
  href?: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  children?: NavChild[];
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

const NAV: NavSection[] = [
  {
    items: [
      { href: '/account', label: 'الملخص', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: 'إدارة الإعلانات',
    items: [
      { href: '/account/listings',          label: 'الإعلانات النشطة',      icon: FileText, exact: true },
      { href: '/account/listings/inactive', label: 'الإعلانات غير النشطة', icon: FileText },
    ],
  },
  {
    title: 'المفضلة',
    items: [
      { href: '/account/favorites',        label: 'إعلاناتي المفضلة',       icon: Star },
      { href: '/account/saved-searches',   label: 'عمليات البحث المفضلة',   icon: Bookmark },
      { href: '/account/favorite-sellers', label: 'البائعون المفضلون',      icon: UserCheck },
    ],
  },
  {
    title: 'الرسائل',
    items: [
      { href: '/account/messages',   label: 'الرسائل',    icon: MessageSquare },
      { href: '/account/questions',  label: 'سؤال وجواب', icon: HelpCircle },
      {
        label: 'عروض الشراء',
        icon: ShoppingCart,
        children: [
          { href: '/account/offers/seller', label: 'أنا بائع' },
          { href: '/account/offers/buyer',  label: 'أنا مشترٍ' },
        ],
      },
    ],
  },
  {
    title: 'التسوق والمعاملات',
    items: [
      {
        label: 'الدفع الآمن',
        icon: Shield,
        children: [
          { href: '/account/secure-payment/buying',   label: 'عمليات الشراء' },
          { href: '/account/secure-payment/selling',  label: 'عمليات البيع' },
        ],
      },
      { label: 'التجارة الإلكترونية الآمنة', icon: CreditCard },
      { label: 'معاملاتي',                 icon: Wallet },
    ],
  },
  {
    title: 'أخرى',
    items: [
      { label: 'الإشعارات',   icon: Bell },
      { label: 'فحص السيارات', icon: Car },
      { label: 'حسابي والإعدادات', icon: Settings },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function active(href: string, exact: boolean, pathname: string): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

export function AccountSidebar() {
  const pathname  = usePathname();
  const { user }  = useAuthStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  }

  const displayName = user?.profile
    ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
    : user?.email ?? '';

  const initial = displayName.charAt(0).toUpperCase() || '?';

  return (
    <div className="flex flex-col gap-3">

      {/* ── User card ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0 font-bold text-orange-600 text-sm">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
            <p className="text-[11px] text-gray-400 truncate">{user?.email ?? ''}</p>
          </div>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
        {NAV.map((section, si) => (
          <div key={si}>
            {section.title && (
              <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider select-none">
                {section.title}
              </p>
            )}

            {section.items.map((item, ii) => {
              const isActive = item.href
                ? active(item.href, item.exact ?? false, pathname)
                : false;

              // ── Accordion item (has sub-links, no direct href) ──────────
              if (item.children) {
                // Active if any direct child OR any grandchild is current path
                const hasActiveChild = item.children.some((c) => {
                  if (c.href && (pathname === c.href || pathname.startsWith(`${c.href}/`))) return true;
                  return c.children?.some((gc) =>
                    pathname === gc.href || pathname.startsWith(`${gc.href}/`),
                  ) ?? false;
                });

                // Auto-expand if a child is active (hasActiveChild must be declared first)
                const isOpen = expanded.has(item.label) || hasActiveChild;

                return (
                  <div key={ii}>
                    {/* Level-0 accordion toggle */}
                    <button
                      type="button"
                      onClick={() => toggleExpanded(item.label)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors border-r-[3px]',
                        hasActiveChild
                          ? 'bg-orange-50 text-orange-600 font-semibold border-orange-500'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent',
                      )}
                    >
                      <item.icon className={cn(
                        'w-4 h-4 shrink-0 transition-colors',
                        hasActiveChild ? 'text-orange-500' : 'text-gray-400',
                      )} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {isOpen
                        ? <ChevronUp   className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                        : <ChevronDown className="w-3.5 h-3.5 shrink-0 text-gray-400" />}
                    </button>

                    {/* Level-1 children */}
                    {isOpen && (
                      <div className="border-t border-gray-50">
                        {item.children.map((child, ci) => {
                          // ── Level-1 nested accordion (child has grandchildren) ──
                          if (child.children) {
                            const subOpen = expanded.has(child.label);
                            const hasActiveGrandchild = child.children.some((gc) =>
                              pathname === gc.href || pathname.startsWith(`${gc.href}/`),
                            );
                            return (
                              <div key={ci}>
                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(child.label)}
                                  className={cn(
                                    'w-full flex items-center gap-1.5 py-2 text-xs transition-colors border-r-[3px]',
                                    'ps-10 pe-4',
                                    hasActiveGrandchild
                                      ? 'bg-orange-50 text-orange-600 font-semibold border-orange-500'
                                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 border-transparent',
                                  )}
                                >
                                  <span className="flex-1 truncate">{child.label}</span>
                                  {subOpen
                                    ? <ChevronUp   className="w-3 h-3 shrink-0 text-gray-400" />
                                    : <ChevronDown className="w-3 h-3 shrink-0 text-gray-400" />}
                                </button>
                                {subOpen && (
                                  <div>
                                    {child.children.map((gc) => {
                                      const gcActive = pathname === gc.href || pathname.startsWith(`${gc.href}/`);
                                      return (
                                        <Link
                                          key={gc.href}
                                          href={gc.href}
                                          className={cn(
                                            'flex items-center py-1.5 text-[11px] transition-colors border-r-[3px]',
                                            'ps-14 pe-4',
                                            gcActive
                                              ? 'bg-orange-50 text-orange-600 font-semibold border-orange-500'
                                              : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700 border-transparent',
                                          )}
                                        >
                                          {gc.label}
                                        </Link>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // ── Level-1 regular link ────────────────────────────
                          const childActive = child.href
                            ? (pathname === child.href || pathname.startsWith(`${child.href}/`))
                            : false;
                          return (
                            <Link
                              key={child.href ?? ci}
                              href={child.href!}
                              className={cn(
                                'flex items-center py-2 text-xs transition-colors border-r-[3px]',
                                'ps-10 pe-4',
                                childActive
                                  ? 'bg-orange-50 text-orange-600 font-semibold border-orange-500'
                                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 border-transparent',
                              )}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // ── Coming-soon item (no href, no children) ─────────────────
              if (!item.href) {
                return (
                  <div
                    key={ii}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 select-none cursor-default"
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full font-semibold">
                      قريباً
                    </span>
                  </div>
                );
              }

              // ── Regular link ────────────────────────────────────────────
              return (
                <Link
                  key={ii}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors border-r-[3px]',
                    isActive
                      ? 'bg-orange-50 text-orange-600 font-semibold border-orange-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent',
                  )}
                >
                  <item.icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      isActive ? 'text-orange-500' : 'text-gray-400',
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

    </div>
  );
}
