'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UserPlus, Loader2, Calculator, MapPin, CheckCircle2,
  Copy, Check, AlertTriangle, ArrowRight, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminNav } from '@/components/admin/AdminNav';
import { useAdminAuthStore } from '@/store/auth.store';
import { staffService, type CreateStaffResult, type StaffRole } from '@/services/staff.service';
import { UI_AR } from '@/lib/staff-labels';

// ── Validation (mirrors the backend rules) ──────────────────────────────────────────
const PHONE_RE = /^\+?[0-9]+$/;

function validateName(v: string): string | null {
  const t = v.trim();
  if (t.length < 2 || t.length > 50) return 'يجب أن يكون الاسم بين 2 و50 حرفاً.';
  return null;
}
function validatePhone(v: string): string | null {
  const t = v.trim();
  if (!PHONE_RE.test(t)) return 'يجب أن يحتوي الهاتف على أرقام فقط (مع + في البداية اختيارياً).';
  if (t.length < 8 || t.length > 16) return 'يجب أن يكون الهاتف بين 8 و16 خانة.';
  return null;
}
function validateRegion(v: string): string | null {
  const t = v.trim();
  if (t && t.length > 100) return 'لا يتجاوز نطاق العمل 100 حرف.';
  return null;
}

// ── Prominent copyable field (staff code / one-time password) ────────────────────────
function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <div className="rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-3">
      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xl font-extrabold text-gray-900 break-all font-mono tracking-wide" dir="ltr">
          {value}
        </span>
        <button
          type="button"
          onClick={copy}
          title="نسخ"
          className="shrink-0 w-9 h-9 rounded-lg bg-white border border-blue-200 hover:bg-blue-100 flex items-center justify-center transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-blue-600" />}
        </button>
      </div>
    </div>
  );
}

// ── Field wrapper ───────────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, error, type = 'text', autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string | null;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="block w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function AdminStaffPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAdminAuthStore();
  const [mounted, setMounted] = useState(false);

  const [role, setRole] = useState<StaffRole>('ACCOUNTANT');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [region, setRegion]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched]       = useState(false);

  const [done, setDone] = useState<CreateStaffResult | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || user?.userType !== 'ADMIN') router.replace('/admin/login');
  }, [mounted, isAuthenticated, user, router]);

  if (!mounted || !isAuthenticated || user?.userType !== 'ADMIN') return null;

  // Errors only surface after a submit attempt (touched), keeping the form quiet initially.
  const nameErr  = touched ? validateName(firstName) : null;
  const lastErr  = touched ? validateName(lastName)  : null;
  const phoneErr = touched ? validatePhone(phone)    : null;
  const regErr   = touched && role === 'FIELD_AGENT' ? validateRegion(region) : null;

  const resetForm = () => {
    setFirstName(''); setLastName(''); setPhone(''); setRegion('');
    setTouched(false);
  };

  const switchRole = (r: StaffRole) => {
    setRole(r);
    setTouched(false);
  };

  const submit = async () => {
    setTouched(true);
    const errs = [
      validateName(firstName), validateName(lastName), validatePhone(phone),
      role === 'FIELD_AGENT' ? validateRegion(region) : null,
    ].filter(Boolean);
    if (errs.length) { toast.error('يرجى تصحيح الأخطاء في النموذج.'); return; }

    setSubmitting(true);
    try {
      const res = await staffService.createStaff({
        role,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        region: role === 'FIELD_AGENT' ? region.trim() || undefined : undefined,
      });
      setDone(res);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذّر الإنشاء.');
    } finally {
      setSubmitting(false);
    }
  };

  const createAnother = () => {
    setDone(null);
    resetForm();
  };

  // Role-specific copy on the (otherwise uniform) success screen.
  const isAccountant = done?.role === 'ACCOUNTANT';
  const successHeading = isAccountant ? 'تم إنشاء محاسب.' : 'تم إنشاء مندوب ميداني.';
  const loginHref      = isAccountant ? '/accounting/login' : '/agent/login';
  const loginLabel     = isAccountant ? 'الذهاب إلى دخول المحاسبة' : 'الذهاب إلى دخول المندوب';

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-sm">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">إنشاء موظف</h1>
            <p className="text-sm text-gray-500">أضِف محاسباً أو مندوباً ميدانياً جديداً.</p>
          </div>
        </div>

        <AdminNav />

        {done ? (
          /* ── Uniform success screen (both roles) ── */
          <div className="bg-white shadow-pebble rounded-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{successHeading}</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {done.user.firstName} {done.user.lastName} ({done.user.phone})
            </p>

            {/* Once-only warning — the oneTimePassword exists only in this response */}
            <div className="mb-4 rounded-xl bg-amber-50 border-2 border-amber-300 px-4 py-3 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 leading-relaxed font-medium">
                تُعرض كلمة المرور هذه مرة واحدة فقط — احفظها. سيسجّل الموظف الدخول عبر{' '}
                <span className="font-semibold">{loginHref}</span> بهذا الرمز وكلمة المرور، ثم
                يغيّر كلمة مروره.
              </p>
            </div>

            <div className="space-y-2.5">
              <CopyField label="رمز الموظف (11 خانة)" value={done.staffCode} />
              <CopyField label="كلمة مرور لمرة واحدة" value={done.oneTimePassword} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={loginHref}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
              >
                {loginLabel} <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={createAnother}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> إنشاء موظف جديد
              </button>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <div className="bg-white shadow-pebble rounded-card p-6">
            {/* Role selector */}
            <label className="block text-xs font-semibold text-gray-700 mb-2">نوع الموظف</label>
            <div className="grid grid-cols-2 gap-2 mb-6">
              <button
                type="button"
                onClick={() => switchRole('ACCOUNTANT')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                  role === 'ACCOUNTANT'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Calculator className="w-4 h-4" /> محاسب
              </button>
              <button
                type="button"
                onClick={() => switchRole('FIELD_AGENT')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                  role === 'FIELD_AGENT'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <MapPin className="w-4 h-4" /> مندوب ميداني
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="الاسم" value={firstName} onChange={setFirstName} placeholder="الاسم" error={nameErr} autoComplete="off" />
              <Field label="الكنية" value={lastName} onChange={setLastName} placeholder="الكنية" error={lastErr} autoComplete="off" />
            </div>

            <div className="mt-4">
              <Field label="رقم الهاتف" value={phone} onChange={setPhone} placeholder="09xxxxxxxx" error={phoneErr} type="tel" autoComplete="off" />
            </div>

            {role === 'FIELD_AGENT' && (
              <div className="mt-4">
                <Field label="نطاق العمل (اختياري)" value={region} onChange={setRegion} placeholder="مثال: دمشق" error={regErr} autoComplete="off" />
              </div>
            )}

            <p className="mt-4 text-[11px] text-gray-500 leading-relaxed">
              يُنشئ الخادم رمز الدخول وكلمة المرور؛ وتُعرض كلمة المرور مرة واحدة فقط بعد الإنشاء.
            </p>

            <button
              onClick={submit}
              disabled={submitting}
              className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {role === 'ACCOUNTANT' ? 'إنشاء محاسب' : 'إنشاء مندوب ميداني'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
