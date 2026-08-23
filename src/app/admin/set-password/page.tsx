'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  AlertCircle, Check, Eye, EyeOff, Loader2, ShieldAlert, ShieldCheck, X,
} from 'lucide-react';
import {
  adminSetupService,
  adminSetupUserToUser,
  ADMIN_SETUP_DEAD_TOKEN_MSG,
} from '@/services/admin-setup.service';
import { adminPasswordChecks, adminPasswordValid } from '@/lib/admin-password';
import { RecoveryCodesPanel } from '@/components/admin/RecoveryCodesPanel';
import { useAdminAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/services/api';
import { cn } from '@/lib/utils';

type Phase = 'loading' | 'dead' | 'form' | 'codes';

interface FormData {
  password: string;
  confirmPassword: string;
}

/**
 * Arabic for the backend's English policy messages.
 *
 * Anything unmapped is shown verbatim rather than swallowed: an untranslated English
 * sentence still tells the admin what to change, whereas a generic "something went wrong"
 * on a password screen tells them nothing and invites them to retry the same string.
 */
function translatePolicyError(message: string): string {
  if (/at least 14 characters/i.test(message)) {
    return 'كلمة مرور الإدارة يجب أن تكون 14 حرفاً على الأقل.';
  }
  if (/three of/i.test(message)) {
    return 'يجب أن تجمع كلمة المرور 3 أنواع على الأقل: حرف صغير، حرف كبير، رقم، رمز.';
  }
  const common = message.match(/common sequence "([^"]+)"/i);
  if (common) {
    return `كلمة المرور تحتوي على تسلسل شائع («${common[1]}») — اختر شيئاً آخر.`;
  }
  if (/based on the account email/i.test(message)) {
    return 'كلمة المرور مبنية على عنوان البريد الإلكتروني للحساب — اختر كلمة مرور غير مرتبطة به.';
  }
  return message;
}

export default function AdminSetPasswordPage() {
  const router = useRouter();
  const { setAuth } = useAdminAuthStore();

  const [phase, setPhase] = useState<Phase>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [continuing, setContinuing] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  const password = watch('password') ?? '';
  const confirmPassword = watch('confirmPassword') ?? '';
  const checks = adminPasswordChecks(password);
  const canSubmit = adminPasswordValid(password) && password === confirmPassword;

  // The link arrives as /admin/set-password?token=… — the shape admin-setup.service.ts's
  // buildSetupUrl emits. Read from window.location rather than useSearchParams to avoid
  // the Suspense-boundary requirement, as reset-password and owner/set-password do.
  useEffect(() => {
    let cancelled = false;
    const raw = new URLSearchParams(window.location.search).get('token');
    const t = raw?.trim() || null;

    if (!t) { setPhase('dead'); return; }
    setToken(t);

    // A transport failure is deliberately treated as "assume valid": the POST is the real
    // gate, and hiding a working form behind a network blip — or behind the setup
    // endpoint's own 10/15min rate limit — would strand the admin this page exists for.
    adminSetupService
      .checkToken(t)
      .then((valid) => { if (!cancelled) setPhase(valid ? 'form' : 'dead'); })
      .catch(() => { if (!cancelled) setPhase('form'); });

    return () => { cancelled = true; };
  }, []);

  const onSubmit = async (data: FormData) => {
    if (!token) { setPhase('dead'); return; }
    setServerError(null);

    try {
      const result = await adminSetupService.setPassword(token, data.password);

      // Establish the admin session immediately. The codes screen is shown from local
      // state, so it survives this — but if the admin closes the tab there, they are
      // still provisioned and can log in normally; only the codes are lost.
      setAuth(adminSetupUserToUser(result.user), result.accessToken, result.refreshToken);

      setCodes(result.recoveryCodes);
      setPhase('codes');
      toast.success('تم تعيين كلمة المرور.');
    } catch (err) {
      // Two different 400s live here and confusing them is expensive in OPPOSITE
      // directions, so each is matched explicitly rather than by elimination:
      //
      // • validate-middleware 400 carries an `errors` field-map (policy failure) — a
      //   VALID token. Treating it as a dead link would burn a working single-use link
      //   off the screen over a weak password, forcing a re-provision for nothing.
      // • the identity rule throws a bare 400 with its own message, also on a valid token.
      // • only the literal dead-token message means the link itself is spent.
      if (err instanceof ApiError && err.status === 400) {
        if (err.message === ADMIN_SETUP_DEAD_TOKEN_MSG) { setPhase('dead'); return; }

        const fieldMsg = err.errors
          ? Object.values(err.errors).flat().find(Boolean)
          : undefined;
        setServerError(translatePolicyError(fieldMsg ?? err.message));
        return;
      }
      if (err instanceof ApiError && err.status === 429) {
        setServerError('محاولات كثيرة خلال وقت قصير. انتظر قليلاً ثم حاول مجدداً.');
        return;
      }
      setServerError('تعذّر تعيين كلمة المرور — تحقق من اتصالك وحاول مجدداً.');
    }
  };

  // Only reached once the admin has ticked the "I saved them" gate.
  const handleAcknowledge = async () => {
    setContinuing(true);
    // Best-effort upgrade to the canonical user row, mirroring what the admin login page
    // does after authenticating. A failure here is not worth blocking on — the session is
    // already live and /admin will fetch what it needs.
    try {
      const { token: accessToken, refreshToken } = useAdminAuthStore.getState();
      const profile = await authService.getProfile();
      if (accessToken && refreshToken) setAuth(profile, accessToken, refreshToken);
    } catch { /* keep the row from the setup response */ }
    router.replace('/admin/listings');
  };

  // ── Probing the token ──
  if (phase === 'loading') {
    return (
      <Shell>
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl px-8 py-16 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          <p className="text-sm text-slate-400">جارٍ التحقق من الرابط…</p>
        </div>
      </Shell>
    );
  }

  // ── Missing / invalid / expired / already-used link ──
  if (phase === 'dead') {
    return (
      <Shell>
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-700 to-red-900 px-8 py-6 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">انتهت صلاحية الرابط</h1>
          </div>

          <div className="px-8 py-7 space-y-5 text-center">
            <p className="text-sm text-slate-300 leading-relaxed">
              رابط تعيين كلمة المرور غير صالح أو منتهي الصلاحية أو تم استخدامه من قبل.
              صلاحية الرابط 24 ساعة ويُستخدم مرة واحدة فقط.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              إذا كان لديك رمز استرداد، يمكنك طلب رابط جديد. وإلا فاطلب من مسؤول آخر
              إعادة إصدار رابط التفعيل.
            </p>

            <Link
              href="/admin/recovery"
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              طلب رابط جديد برمز الاسترداد
            </Link>

            <Link
              href="/admin/login"
              className="block text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              العودة إلى تسجيل الدخول
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // ── The one-time recovery codes ──
  if (phase === 'codes') {
    return (
      <Shell>
        <RecoveryCodesPanel
          codes={codes}
          onAcknowledge={handleAcknowledge}
          continuing={continuing}
        />
      </Shell>
    );
  }

  // ── The form ──
  return (
    <Shell>
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-8 py-6 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-white tracking-tight">تعيين كلمة مرور الإدارة</h1>
            <p className="text-blue-300 text-xs mt-0.5">تفعيل حساب المسؤول لأول مرة</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="px-8 py-7 space-y-5">
          {serverError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300 leading-snug">{serverError}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              كلمة المرور الجديدة
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="14 حرفاً على الأقل"
                className="w-full bg-slate-700/60 border border-slate-600 text-white rounded-lg px-3 py-2.5 pe-10 text-[16px] placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors"
                {...register('password', { required: 'كلمة المرور مطلوبة' })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                tabIndex={-1}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              تأكيد كلمة المرور
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="أعد إدخال كلمة المرور"
                className="w-full bg-slate-700/60 border border-slate-600 text-white rounded-lg px-3 py-2.5 pe-10 text-[16px] placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors"
                {...register('confirmPassword', {
                  required: 'أعد إدخال كلمة المرور',
                  validate: (v) => v === password || 'كلمتا المرور غير متطابقتين',
                })}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                tabIndex={-1}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-400 text-xs">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Live policy checklist. Stricter than the consumer rules on purpose — the
              copy says so, because an admin who hits "14 characters" without being told
              why assumes the form is broken. */}
          <div className="rounded-lg bg-slate-900/50 border border-slate-700 p-3.5 space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              متطلبات كلمة مرور الإدارة
            </p>
            <ul className="space-y-1.5">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-1.5 text-xs">
                  {c.ok
                    ? <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-green-400" />
                    : <X className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-600" />}
                  <span className={cn('leading-relaxed', c.ok ? 'text-green-400' : 'text-slate-400')}>
                    {c.label}
                    {c.detail && <span className="text-slate-500"> — {c.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
              ولا تكون مبنية على عنوان بريد الحساب (يتحقق الخادم من ذلك عند الحفظ).
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !canSubmit}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'جارٍ الحفظ…' : 'تعيين كلمة المرور'}
          </button>

          <p className="text-center text-[11px] text-slate-500 leading-relaxed">
            بعد الحفظ ستظهر رموز الاسترداد مرة واحدة فقط — جهّز مكاناً آمناً لحفظها.
          </p>
        </form>
      </div>
    </Shell>
  );
}

/** Same frame as the admin login portal, so the three admin entry points read as one. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-900 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
