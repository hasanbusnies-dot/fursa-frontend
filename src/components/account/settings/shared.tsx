'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ChevronRight, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { ApiError } from '@/services/api';
import type { MeUser } from '@/services/users.service';
import { cn } from '@/lib/utils';

// ── Shared form primitives (wizard Field style) ────────────────────────────────

export const inputCls = (err?: string) =>
  `w-full px-3 py-2.5 border rounded-lg text-[16px] focus:outline-none focus:ring-1 transition-colors ${
    err
      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
  }`;

export function Field({ label, error, required, hint, children }: {
  label: string; error?: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

export function SectionCard({ icon: Icon, title, subtitle, children }: {
  icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-card shadow-pebble p-5">
      <div className="flex items-start gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function SaveButton({ saving, label }: { saving: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className={cn(
        'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-colors',
        saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700',
      )}
    >
      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
      {label}
    </button>
  );
}

// Maps known backend (English) messages to Arabic before showing them.
export function arabicApiMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const m = err.message.toLowerCase();
    if (m.includes('current password is incorrect')) return 'كلمة المرور الحالية غير صحيحة.';
    if (m.includes('validation failed')) return 'بعض الحقول غير صالحة — تحقق من المدخلات.';
  }
  return fallback;
}

export const USER_TYPE_LABEL: Record<MeUser['userType'], string> = {
  INDIVIDUAL: 'حساب فردي',
  CORPORATE: 'حساب متجر',
  ADMIN: 'إدارة',
  FIELD_AGENT: 'وكيل ميداني',
  ACCOUNTANT: 'محاسب',
};

export function formatDateAr(d?: string | null) {
  if (!d) return '—';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString('ar-SY', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Page-level chrome shared by the settings sub-pages ─────────────────────────

export function PageSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="rounded-card bg-white shadow-pebble h-52 animate-pulse" />
      <div className="rounded-card bg-white shadow-pebble h-72 animate-pulse" />
      <div className="rounded-card bg-white shadow-pebble h-60 animate-pulse" />
    </div>
  );
}

export function LoadError() {
  return (
    <div className="bg-white rounded-card shadow-pebble p-10 text-center text-gray-500">
      <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-400" />
      تعذّر تحميل بيانات الحساب — أعد تحميل الصفحة.
    </div>
  );
}

/**
 * Client-side auth gate shared by all settings pages.
 * Returns true once mounted AND authenticated; redirects to /login otherwise.
 * Render the PageSkeleton while it's false.
 */
export function useRequireAuth(redirectTo: string): boolean {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) router.replace(`/login?redirect=${redirectTo}`);
  }, [mounted, isAuthenticated, router, redirectTo]);

  return mounted && isAuthenticated;
}

/**
 * Sub-page header: section title + a back link to the settings landing.
 * The back link only shows on mobile — desktop has the sidebar sub-menu.
 * RTL: "back" points towards inline-start (right), hence ChevronRight.
 */
export function SettingsHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div>
      <Link
        href="/account/settings"
        className="lg:hidden inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-1.5"
      >
        <ChevronRight className="w-3.5 h-3.5" />
        حسابي والإعدادات
      </Link>
      <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
        <Icon className="w-5 h-5 text-blue-600" />
        {title}
      </h1>
    </div>
  );
}
