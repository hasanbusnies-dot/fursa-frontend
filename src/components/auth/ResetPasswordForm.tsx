'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Check, CheckCircle2, Eye, EyeOff, Loader2, ShieldAlert, X } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { FormError } from '@/components/ui/FormError';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

// Mirrors the backend's `strongPassword` (auth.schemas.ts) exactly — 8 chars, one A–Z,
// one digit. Same three rules registration enforces; a reset that accepted anything
// weaker would be a downgrade path around the signup policy.
const schema = z
  .object({
    password: z
      .string()
      .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      .regex(/[A-Z]/, 'يجب أن تحتوي على حرف إنجليزي كبير واحد على الأقل (A-Z)')
      .regex(/[0-9]/, 'يجب أن تحتوي على رقم واحد على الأقل'),
    confirmPassword: z.string().min(1, 'أعد إدخال كلمة المرور'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'كلمتا المرور غير متطابقتين',
  });
type FormData = z.infer<typeof schema>;

const DEAD_LINK_MSG = 'الرابط غير صالح أو منتهي الصلاحية، اطلب رابطاً جديداً.';

const REDIRECT_MS = 2500;

type Phase = 'loading' | 'dead' | 'form' | 'done';

export function ResetPasswordForm() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const password = watch('password') ?? '';
  const checks = [
    { label: '8 أحرف على الأقل', ok: password.length >= 8 },
    { label: 'حرف كبير واحد على الأقل (A–Z)', ok: /[A-Z]/.test(password) },
    { label: 'رقم واحد على الأقل (0–9)', ok: /[0-9]/.test(password) },
  ];

  // The token arrives as ?token=… — the shape password-reset.service.ts's buildResetUrl
  // emits: `${FRONTEND_BASE_URL}/reset-password?token=${rawToken}`.
  //
  // Read from window.location rather than useSearchParams, to avoid the Suspense-boundary
  // requirement — the same approach owner/set-password/page.tsx takes for its emailed
  // token, and LoginForm for ?redirect=.
  useEffect(() => {
    let cancelled = false;
    const raw = new URLSearchParams(window.location.search).get('token');
    const t = raw && raw.trim() ? raw.trim() : null;

    if (!t) { setPhase('dead'); return; }
    setToken(t);

    // Cheap read-only probe so an expired link says so before the user types a new
    // password twice for nothing. A transport failure is deliberately treated as
    // "assume valid": the POST is the real gate, and hiding a working form behind a
    // network blip would be the worse failure on a recovery path.
    authService
      .checkResetToken(t)
      .then((valid) => { if (!cancelled) setPhase(valid ? 'form' : 'dead'); })
      .catch(() => { if (!cancelled) setPhase('form'); });

    return () => { cancelled = true; };
  }, []);

  // Land on /login once the success screen has been read.
  useEffect(() => {
    if (phase !== 'done') return;
    const id = setTimeout(() => router.replace('/login'), REDIRECT_MS);
    return () => clearTimeout(id);
  }, [phase, router]);

  const onSubmit = async (data: FormData) => {
    if (!token) { setPhase('dead'); return; }
    setServerError(null);
    try {
      await authService.resetPassword(token, data.password);

      // The backend revokes every refresh token on a successful reset (a reset answers a
      // suspected compromise). Any session this browser still holds is therefore already
      // dead server-side — drop it locally too, so the app does not carry revoked tokens
      // into the login it is about to show.
      const { isAuthenticated, logout } = useAuthStore.getState();
      if (isAuthenticated) logout();

      toast.success('تم تغيير كلمة المرور بنجاح.');
      setPhase('done');
    } catch (err) {
      // TWO different 400s live here, and telling them apart matters.
      //
      // The validate middleware also answers 400 ("Validation failed") when the password
      // fails strongPassword — and that one carries a field-errors map, while the
      // dead-link 400 has no `errors`. Treating both as a dead link would burn a
      // PERFECTLY VALID token off the screen over a typo, forcing the user to request a
      // new email for nothing. The zod schema above mirrors the backend's three rules so
      // this should be unreachable, but the two failures are not interchangeable and the
      // cost of confusing them is asymmetric.
      if (err instanceof ApiError && err.status === 400 && err.errors) {
        setServerError('كلمة المرور لا تحقق الشروط المطلوبة.');
        return;
      }
      // The real dead link: invalid / expired / already-used. The backend returns all
      // three identically on purpose (a distinct "expired" would confirm the token was
      // once real), so this branch must not try to tell them apart either.
      if (err instanceof ApiError && err.status === 400) { setPhase('dead'); return; }
      if (err instanceof ApiError && err.status === 429) {
        setServerError('محاولات كثيرة خلال وقت قصير. انتظر قليلاً ثم حاول مجدداً.');
        return;
      }
      setServerError('تعذّر تغيير كلمة المرور — تحقق من اتصالك وحاول مجدداً.');
    }
  };

  // ── Probing the token ──
  if (phase === 'loading') {
    return (
      <div className="bg-white rounded-card shadow-pebble p-8 flex flex-col items-center justify-center gap-3 min-h-[16rem]">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <p className="text-sm text-gray-500">جارٍ التحقق من الرابط…</p>
      </div>
    );
  }

  // ── Missing / invalid / expired / already-used link ──
  if (phase === 'dead') {
    return (
      <div className="bg-white rounded-card shadow-pebble p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
            <ShieldAlert className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">انتهت صلاحية الرابط</h1>
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">{DEAD_LINK_MSG}</p>

          <Link href="/forgot-password" className="w-full mt-7">
            <Button className="w-full" size="lg">اطلب رابطاً جديداً</Button>
          </Link>

          <Link
            href="/login"
            className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            العودة إلى تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  // ── Reset done ──
  if (phase === 'done') {
    return (
      <div className="bg-white rounded-card shadow-pebble p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">تم تغيير كلمة المرور</h1>
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">
            تم تغيير كلمة المرور، يمكنك تسجيل الدخول الآن.
          </p>
          <p className="mt-3 text-xs text-gray-400">
            تم إنهاء جميع الجلسات المفتوحة على الأجهزة الأخرى.
          </p>

          <Link href="/login" className="w-full mt-7">
            <Button className="w-full" size="lg">تسجيل الدخول</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── The form ──
  return (
    <div className="bg-white rounded-card shadow-pebble p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">تعيين كلمة مرور جديدة</h1>
        <p className="mt-1 text-sm text-gray-500">اختر كلمة مرور قوية لا تستخدمها في مكان آخر.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {serverError && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        )}

        <div>
          <Label htmlFor="password" required>كلمة المرور الجديدة</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="8 أحرف، حرف كبير ورقم"
              error={!!errors.password}
              className="pe-10"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              tabIndex={-1}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <FormError message={errors.password?.message} />
        </div>

        <div>
          <Label htmlFor="confirmPassword" required>تأكيد كلمة المرور</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="أعد إدخال كلمة المرور"
              error={!!errors.confirmPassword}
              className="pe-10"
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              tabIndex={-1}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <FormError message={errors.confirmPassword?.message} />
        </div>

        {/* Live policy checklist — same three rules, same presentation as
            account settings' PasswordSection. */}
        <ul className="space-y-1">
          {checks.map((c) => (
            <li
              key={c.label}
              className={cn('flex items-center gap-1.5 text-xs', c.ok ? 'text-green-600' : 'text-gray-400')}
            >
              {c.ok ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
              {c.label}
            </li>
          ))}
        </ul>

        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          تغيير كلمة المرور
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700 transition-colors">
          العودة إلى تسجيل الدخول
        </Link>
      </p>
    </div>
  );
}
