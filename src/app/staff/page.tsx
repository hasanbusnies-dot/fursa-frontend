'use client';

import Link from 'next/link';
import { ShieldCheck, Calculator, HandCoins, Headset, ChevronLeft, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Unified staff entry hub. URL-only (staff type /staff directly — not linked from the
// consumer site). No auth here: each card just routes to that section's own /login,
// which owns the role gate. Consumer chrome is hidden on /staff (see Header/Footer/
// BottomNav/MobileTopBar). A logged-in accountant/agent who lands here is bounced to
// their own area by StaffRouteLock; logged-out staff (the real audience) see the chooser.
//
// Data-driven: to launch "خدمة العملاء" later, flip `disabled` off and set its `href`.

type StaffSection = {
  key: string;
  label: string;
  subtitle: string;
  href?: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon tile gradient — matches each section's login theme. */
  gradient: string;
  disabled?: boolean;
};

const SECTIONS: StaffSection[] = [
  {
    key: 'admin',
    label: 'الإدارة',
    subtitle: 'لوحة تحكم المسؤولين',
    href: '/admin/login',
    icon: ShieldCheck,
    gradient: 'from-blue-700 to-blue-900',
  },
  {
    key: 'accounting',
    label: 'المحاسبة',
    subtitle: 'الإدارة المالية والتسويات',
    href: '/accounting/login',
    icon: Calculator,
    gradient: 'from-emerald-700 to-emerald-900',
  },
  {
    key: 'agent',
    label: 'المندوب',
    subtitle: 'تحصيل المندوبين الميدانيين',
    href: '/agent/login',
    icon: HandCoins,
    gradient: 'from-teal-600 to-teal-800',
  },
  {
    key: 'customer-service',
    label: 'خدمة العملاء',
    subtitle: 'دعم العملاء',
    icon: Headset,
    gradient: 'from-slate-600 to-slate-700',
    disabled: true,
  },
];

function SectionCard({ section }: { section: StaffSection }) {
  const Icon = section.icon;

  const inner = (
    <>
      <div className="flex items-center gap-4">
        <div className={cn('w-14 h-14 rounded-xl bg-gradient-to-l flex items-center justify-center shadow-sm shrink-0', section.gradient)}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-white truncate">{section.label}</h2>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{section.subtitle}</p>
        </div>
      </div>

      {section.disabled ? (
        <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-700 text-slate-300">قريباً</span>
      ) : (
        <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
      )}
    </>
  );

  const base = 'flex items-center justify-between gap-3 rounded-2xl border p-5 transition-all';

  if (section.disabled || !section.href) {
    return (
      <div
        className={cn(base, 'bg-slate-800/60 border-slate-700/60 cursor-not-allowed opacity-60')}
        aria-disabled="true"
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={section.href}
      className={cn(base, 'group bg-slate-800 border-slate-700 hover:border-slate-600 hover:bg-slate-800/80 shadow-lg')}
    >
      {inner}
    </Link>
  );
}

export default function StaffPortalPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">بوابة الموظفين</h1>
          <p className="text-sm text-slate-400 mt-1">اختر القسم</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SECTIONS.map((s) => <SectionCard key={s.key} section={s} />)}
        </div>

        <p className="text-center mt-8 text-slate-600 text-sm">
          <a href="/" className="hover:text-slate-400 transition-colors">
            ← العودة إلى الموقع الرئيسي
          </a>
        </p>
      </div>
    </div>
  );
}
