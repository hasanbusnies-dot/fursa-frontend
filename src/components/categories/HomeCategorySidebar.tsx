'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Clock, ChevronDown, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SIDEBAR_CATEGORIES, type SubCategory, type RootCategory } from '@/data/sidebar-categories';

// ── SubItem — renders a plain link or an expandable nested group ──────────────

const ORANGE_PARENTS = new Set(['مركبات تجارية', 'مركبات للإيجار', 'مركبات بحرية', 'مركبات متضررة', 'كرفانات', 'مركبات كلاسيكية', 'مركبات جوية', 'عقارات سكنية', 'عقارات تجارية', 'أراضي', 'أبنية / عمارات', 'ملكية مشتركة (تايم شير)', 'منشآت سياحية']);

function SubItem({ sub, depth = 0 }: { sub: SubCategory; depth?: number }) {
  const pathname   = usePathname();
  const isActive   = pathname === sub.path;
  const isAncestor = !isActive && pathname.startsWith(sub.path + '/');
  const [open, setOpen] = useState(() => isAncestor);

  const rowPadding = depth === 0 ? 'px-4' : depth === 1 ? 'pl-8 pr-4' : 'pl-12 pr-4';
  const textBase   = depth === 0 ? 'text-sm' : 'text-[13px]';
  const dotColor   = depth === 0 ? 'bg-gray-300' : 'bg-gray-200';

  const useOrange  = ORANGE_PARENTS.has(sub.title);
  const nestedBg   = useOrange
    ? 'bg-orange-50/70 border-b border-orange-200'
    : depth >= 1
      ? 'bg-orange-50/40 border-b border-orange-100'
      : 'bg-slate-50 border-b border-gray-200';

  // Leaf link
  if (!sub.children?.length) {
    return (
      <Link
        href={sub.path}
        className={cn(
          `flex items-center gap-2 ${rowPadding} py-1.5 ${textBase} transition-colors`,
          depth > 0
            ? isActive
              ? 'text-orange-600 font-semibold bg-orange-50'
              : 'text-gray-500 hover:text-orange-600 hover:bg-orange-100/50'
            : isActive
              ? 'text-blue-600 font-semibold bg-blue-50'
              : 'text-gray-600 hover:text-blue-600 hover:bg-blue-100/40',
        )}
      >
        <span className={`w-1 h-1 rounded-full ${dotColor} shrink-0`} />
        {sub.title}
      </Link>
    );
  }

  // Expandable row
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          `w-full flex items-center gap-2 ${rowPadding} py-1.5 ${textBase} transition-colors`,
          isActive || isAncestor
            ? 'text-orange-600 bg-orange-50/60'
            : 'text-gray-600 hover:text-blue-600 hover:bg-blue-100/40',
        )}
      >
        <span className={`w-1 h-1 rounded-full ${dotColor} shrink-0`} />
        <span className="flex-1 text-start">{sub.title}</span>
        <ChevronDown
          className={cn(
            'w-3 h-3 text-gray-400 transition-transform duration-200 shrink-0',
            open && 'rotate-180 text-blue-500',
          )}
        />
      </button>

      {open && (
        <div className={cn('border-t border-gray-100/60 py-2', nestedBg)}>
          {sub.children.map((child) => (
            <SubItem key={child.path} sub={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Accordion card ────────────────────────────────────────────────────────────

function AccordionCard({ cat }: { cat: RootCategory }) {
  const [open, setOpen] = useState(false);
  const Icon = cat.icon;

  return (
    <div
      className={cn(
        'rounded-xl border transition-colors overflow-hidden',
        open ? 'border-blue-200 bg-white' : 'border-gray-200 bg-white',
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50/80 transition-colors"
      >
        <div className={`w-7 h-7 rounded-lg ${cat.iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-3.5 h-3.5 ${cat.iconColor}`} />
        </div>
        <span className="flex-1 text-sm font-semibold text-gray-800 text-start">
          {cat.title}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0',
            open && 'rotate-180 text-blue-500',
          )}
        />
      </button>

      {/* Subcategory list */}
      {open && (
        <div className="border-t border-gray-100 border-b border-gray-200 bg-slate-50 py-2">
          {cat.children.map((sub) => (
            <SubItem key={sub.path} sub={sub} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function HomeCategorySidebar() {
  const router = useRouter();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">

      {/* ── Quick links ── */}
      <div className="space-y-0.5">
        <Link
          href="/listings?showcase=urgent_showcase"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-orange-50 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-orange-100 flex items-center justify-center text-sm shrink-0 transition-colors">
            🚨
          </div>
          <span className="text-sm text-gray-700 group-hover:text-orange-600 font-medium transition-colors">
            عاجل عاجل
          </span>
        </Link>

        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-gray-400" />
          </div>
          <span className="text-sm text-gray-700 leading-relaxed">
            <Link href="/listings?showcase=last_48h" className="text-blue-600 hover:underline">آخر 48 ساعة</Link>
            {' · '}
            <Link href="/listings?showcase=one_week" className="text-blue-600 hover:underline">آخر أسبوع</Link>
            {' · '}
            <Link href="/listings?showcase=one_month" className="text-blue-600 hover:underline">آخر شهر</Link>
          </span>
        </div>
      </div>

      {/* ── All listings ── */}
      <button
        type="button"
        onClick={() => router.push('/listings')}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
      >
        <LayoutGrid className="w-3.5 h-3.5 shrink-0 text-gray-400" />
        كل الإعلانات
      </button>

      {/* ── Category accordion cards ── */}
      <div className="space-y-1.5">
        {SIDEBAR_CATEGORIES.map((cat) => (
          <AccordionCard key={cat.title} cat={cat} />
        ))}
      </div>

    </div>
  );
}
