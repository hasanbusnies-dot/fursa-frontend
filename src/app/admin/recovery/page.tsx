'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { AlertCircle, KeyRound, Loader2, MailCheck } from 'lucide-react';
import { adminSetupService } from '@/services/admin-setup.service';
import { ApiError } from '@/services/api';

interface FormData {
  email: string;
  code: string;
}

/**
 * Break-glass recovery for a locked-out admin.
 *
 * ⚠ NON-ENUMERATING BY CONSTRUCTION. The backend answers one fixed 200 whether the
 * address is unknown, the code is wrong, or a link was genuinely sent — so this page must
 * render the same confirmation on every success path and must never branch on the
 * response. Adding a "no such account" or "wrong code" state here would hand back exactly
 * the oracle the backend spent its design on removing: an attacker who knows an admin
 * address could otherwise confirm it, and grind codes with feedback.
 *
 * The only errors surfaced are transport-level and rate-limit ones, which say nothing
 * about whether the account or the code exists.
 */
export default function AdminRecoveryPage() {
  const [sent, setSent] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setGlobalError(null);
    try {
      await adminSetupService.requestRecovery(data.email.trim(), data.code.trim());
      // Deliberately unconditional: resolution means "the server accepted the request",
      // never "the code was right".
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setGlobalError('محاولات كثيرة خلال وقت قصير. انتظر قليلاً ثم حاول مجدداً.');
        return;
      }
      if (err instanceof ApiError && err.status === 400 && err.errors) {
        setGlobalError('تحقق من صيغة البريد الإلكتروني ورمز الاسترداد.');
        return;
      }
      setGlobalError('تعذّر إرسال الطلب — تحقق من اتصالك وحاول مجدداً.');
    }
  };

  if (sent) {
    return (
      <Shell>
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-8 py-6 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <MailCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">تم استلام الطلب</h1>
          </div>

          <div className="px-8 py-7 space-y-5 text-center">
            <p className="text-sm text-slate-300 leading-relaxed">
              إذا كان الرمز صحيحاً، فسنرسل رابطاً جديداً لتعيين كلمة المرور إلى بريد الحساب.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              يُرسل الرابط دائماً إلى العنوان المسجّل على الحساب. صلاحيته 24 ساعة،
              ورمز الاسترداد المستخدم لا يصلح مرة أخرى.
            </p>

            <Link
              href="/admin/login"
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              العودة إلى تسجيل الدخول
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-8 py-6 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-white tracking-tight">استعادة حساب الإدارة</h1>
            <p className="text-blue-300 text-xs mt-0.5">باستخدام أحد رموز الاسترداد</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="px-8 py-7 space-y-5">
          <p className="text-xs text-slate-400 leading-relaxed">
            أدخل بريد الحساب وأحد رموز الاسترداد العشرة التي حفظتها عند التفعيل.
            سنرسل رابطاً جديداً لتعيين كلمة المرور إلى بريد الحساب المسجّل.
          </p>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              dir="ltr"
              placeholder="admin@forsa.com"
              className="w-full bg-slate-700/60 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-[16px] placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors"
              {...register('email', {
                required: 'البريد الإلكتروني مطلوب',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'أدخل بريداً إلكترونياً صحيحاً' },
              })}
            />
            {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="code" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              رمز الاسترداد
            </label>
            {/* dir=ltr + uppercase: the codes are Latin 4-4-4. The backend normalizes
                spacing, casing and dashes, so a pasted code in any shape is accepted. */}
            <input
              id="code"
              type="text"
              autoComplete="one-time-code"
              dir="ltr"
              spellCheck={false}
              autoCapitalize="characters"
              placeholder="XXXX-XXXX-XXXX"
              className="w-full bg-slate-700/60 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-[16px] font-mono tracking-[0.12em] placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-colors"
              {...register('code', { required: 'رمز الاسترداد مطلوب' })}
            />
            {errors.code && <p className="text-red-400 text-xs">{errors.code.message}</p>}
          </div>

          {globalError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300 leading-snug">{globalError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'جارٍ الإرسال…' : 'إرسال رابط جديد'}
          </button>

          <p className="text-center text-sm text-slate-500">
            <Link href="/admin/login" className="font-medium text-slate-400 hover:text-slate-200 transition-colors">
              العودة إلى تسجيل الدخول
            </Link>
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
