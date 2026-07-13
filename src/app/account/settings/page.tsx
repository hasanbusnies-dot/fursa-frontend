'use client';

import Link from 'next/link';
import { Settings, User, ShieldCheck, SlidersHorizontal, ChevronLeft } from 'lucide-react';
import { useRequireAuth, PageSkeleton } from '@/components/account/settings/shared';

// Landing menu for the settings sub-pages — the primary navigation on mobile
// (the account sidebar is hidden there); on desktop the sidebar sub-menu links
// straight to the sections and this page is rarely seen.
const SECTIONS = [
  {
    href: '/account/settings/profile',
    icon: User,
    title: 'معلوماتي',
    desc: 'صورتك واسمك وبياناتك الشخصية وبيانات تسجيل الدخول.',
  },
  {
    href: '/account/settings/security',
    icon: ShieldCheck,
    title: 'أمان الحساب',
    desc: 'كلمة المرور والأجهزة المسجّل دخولها إلى حسابك.',
  },
  {
    href: '/account/settings/notifications',
    icon: SlidersHorizontal,
    title: 'إعدادات التطبيق',
    desc: 'تفضيلات الإشعارات وقنوات وصولها.',
  },
];

export default function AccountSettingsPage() {
  const ready = useRequireAuth('/account/settings');

  if (!ready) return <PageSkeleton />;

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
        <Settings className="w-5 h-5 text-blue-600" />
        حسابي والإعدادات
      </h1>

      <div className="space-y-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex items-center gap-3.5 bg-white rounded-card shadow-pebble p-4 transition-shadow hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <s.icon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900">{s.title}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{s.desc}</p>
            </div>
            {/* RTL: forward chevron points inline-end (left) */}
            <ChevronLeft className="w-4 h-4 text-gray-300 shrink-0 transition-colors group-hover:text-blue-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}
