'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { KeyRound, Loader2, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { ownerAuthService } from '@/services/owner-auth.service';
import { ApiError } from '@/services/api';

// Strong-password rules — same contract as the agent forced first-set (AP-M1).
const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'كلمة المرور 8 أحرف على الأقل')
      .regex(/[A-Z]/, 'حرف كبير واحد على الأقل')
      .regex(/\d/, 'رقم واحد على الأقل'),
    confirm: z.string().min(1, 'أعد إدخال كلمة المرور'),
  })
  .refine((d) => d.newPassword === d.confirm, {
    path: ['confirm'],
    message: 'كلمتا المرور غير متطابقتين',
  });
type FormData = z.infer<typeof schema>;

const INVALID_LINK_MSG =
  'رابط تعيين كلمة المرور غير صالح أو منتهي الصلاحية. تواصل مع المندوب للحصول على رابط جديد.';

export default function OwnerSetPasswordPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  // Token comes from the email link (?token=xxx). Read from window.location (not
  // useSearchParams) to avoid the Suspense-boundary requirement — same approach as
  // the consumer LoginForm's ?redirect= handling. Populated after mount.
  const [mounted, setMounted]     = useState(false);
  const [token, setToken]         = useState<string | null>(null);
  const [showPassword, setShow]   = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null); // invalid/expired link
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token');
    setToken(t && t.trim() ? t : null);
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (!token) { setLinkError(INVALID_LINK_MSG); return; }
    setGlobalError('');
    try {
      const authed = await ownerAuthService.setPassword(token, data.newPassword);
      // Backend auto-logs-in: store tokens exactly like a consumer login, then land
      // the owner inside the app (NO redirect to a login page).
      setAuth(authed.user, authed.token, authed.refreshToken);
      toast.success(`أهلاً، ${authed.user.profile?.firstName ?? 'بك'}! تم تفعيل حسابك.`);
      router.replace('/');
    } catch (err) {
      // 400 ⇒ invalid / expired / already-used token: switch to the dead-link state.
      if (err instanceof ApiError && err.status === 400) {
        setLinkError(err.message || INVALID_LINK_MSG);
      } else {
        setGlobalError(
          err instanceof Error ? err.message : 'تعذّر تعيين كلمة المرور. حاول مرة أخرى.',
        );
      }
    }
  };

  // ── Loading shell until we've read the token from the URL ──
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" dir="rtl">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  const noToken = token === null;
  const dead = linkError !== null || noToken;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16" dir="rtl">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8 text-2xl font-black text-blue-600">
          فرصة
        </Link>

        <div className="bg-white rounded-card shadow-pebble overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-l from-blue-600 to-blue-800 px-8 py-6 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              {dead ? <ShieldAlert className="w-6 h-6 text-white" /> : <KeyRound className="w-6 h-6 text-white" />}
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold text-white">تعيين كلمة المرور</h1>
              <p className="text-blue-200 text-xs mt-0.5">
                {dead ? 'تعذّر متابعة تفعيل الحساب' : 'اختر كلمة مرور لتفعيل حساب متجرك'}
              </p>
            </div>
          </div>

          {dead ? (
            // ── Invalid / missing / expired link ──
            <div className="px-8 py-8 text-center space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                {linkError ?? INVALID_LINK_MSG}
              </p>
              <Link
                href="/"
                className="inline-block text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                العودة إلى الصفحة الرئيسية
              </Link>
            </div>
          ) : (
            // ── Set-password form ──
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="px-8 py-7 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">كلمة المرور الجديدة</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    dir="ltr"
                    {...register('newPassword')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 ps-10 text-[16px] text-start focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-red-500 text-xs">{errors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">تأكيد كلمة المرور</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  dir="ltr"
                  {...register('confirm')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-[16px] text-start focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
                />
                {errors.confirm && (
                  <p className="text-red-500 text-xs">{errors.confirm.message}</p>
                )}
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed">
                يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل، وحرف كبير واحد، ورقم واحد.
              </p>

              {globalError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <p className="text-red-700 text-sm leading-snug">{globalError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'جارٍ التفعيل…' : 'تفعيل الحساب والمتابعة'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
