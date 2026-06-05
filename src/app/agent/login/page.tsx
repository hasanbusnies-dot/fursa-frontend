'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { HandCoins, KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { agentAuthService, type AgentAuthed } from '@/services/agent-auth.service';
import { ApiError } from '@/services/api';

// ── Schemas ───────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  agentCode: z.string().regex(/^\d{11}$/, 'رمز المندوب مكوّن من 11 رقماً'),
  phone:     z.string().min(1, 'رقم الهاتف مطلوب'),
  password:  z.string().min(1, 'كلمة المرور مطلوبة'),
});
type LoginForm = z.infer<typeof loginSchema>;

const resetSchema = z
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
type ResetForm = z.infer<typeof resetSchema>;

const GENERIC_ERROR = 'بيانات الدخول غير صحيحة. حاول مرة أخرى.';

// ── Page ────────────────────────────────────────────────────────────────────────

export default function AgentLoginPage() {
  const router = useRouter();
  const { setAuth, logout } = useAuthStore();

  // Phase: regular 3-factor login, or the forced first-password reset.
  const [phase, setPhase]           = useState<'login' | 'reset'>('login');
  const [resetToken, setResetToken] = useState('');      // one-off — component state only

  const [isLoading,    setIsLoading]    = useState(false);
  const [globalError,  setGlobalError]  = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  // Store tokens exactly like the regular login and enter the panel.
  const enterPanel = (authed: AgentAuthed) => {
    // Backend already gates non-agents at /agent/login; verify defensively.
    if (authed.user.userType !== 'FIELD_AGENT') {
      logout();
      setGlobalError('الدخول مرفوض. هذه البوابة مخصّصة لمندوبي التحصيل فقط.');
      return;
    }
    setAuth(authed.user, authed.token, authed.refreshToken);
    toast.success(`أهلاً، ${authed.user.profile?.firstName ?? 'مندوب'}.`);
    router.replace('/agent/collect');
  };

  const onLogin = async (data: LoginForm) => {
    setIsLoading(true);
    setGlobalError('');
    try {
      const result = await agentAuthService.login(data);
      if (result.kind === 'mustChange') {
        // First login with the one-time password → forced reset; no tokens yet.
        setResetToken(result.resetToken);
        setPhase('reset');
        return;
      }
      enterPanel(result);
    } catch (err) {
      setGlobalError(err instanceof ApiError || err instanceof Error ? err.message : GENERIC_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const onReset = async (data: ResetForm) => {
    setIsLoading(true);
    setGlobalError('');
    try {
      const authed = await agentAuthService.firstSetPassword(data.newPassword, resetToken);
      enterPanel(authed);
    } catch (err) {
      setGlobalError(err instanceof ApiError || err instanceof Error ? err.message : GENERIC_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const isReset = phase === 'reset';

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-16" dir="rtl">
      <div className="w-full max-w-sm">

        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">

          {/* Header strip */}
          <div className="bg-gradient-to-l from-teal-600 to-teal-800 px-8 py-6 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              {isReset ? <KeyRound className="w-6 h-6 text-white" /> : <HandCoins className="w-6 h-6 text-white" />}
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold text-white tracking-tight">
                {isReset ? 'تعيين كلمة المرور' : 'لوحة المندوب'}
              </h1>
              <p className="text-teal-200 text-xs mt-0.5">
                {isReset ? 'اختر كلمة مرور جديدة لمتابعة الدخول' : 'مخصّصة لمندوبي التحصيل'}
              </p>
            </div>
          </div>

          {/* ── Login form ── */}
          {!isReset && (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="px-8 py-7 space-y-5">

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">رمز المندوب</label>
                <input
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={11}
                  placeholder="11 رقماً"
                  dir="ltr"
                  {...loginForm.register('agentCode')}
                  className="w-full bg-slate-700/60 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm placeholder-slate-500 text-start tracking-widest focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-colors"
                />
                {loginForm.formState.errors.agentCode && (
                  <p className="text-red-400 text-xs">{loginForm.formState.errors.agentCode.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">رقم الهاتف</label>
                <input
                  inputMode="tel"
                  autoComplete="username"
                  placeholder="09xxxxxxxx"
                  dir="ltr"
                  {...loginForm.register('phone')}
                  className="w-full bg-slate-700/60 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm placeholder-slate-500 text-start focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-colors"
                />
                {loginForm.formState.errors.phone && (
                  <p className="text-red-400 text-xs">{loginForm.formState.errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    dir="ltr"
                    {...loginForm.register('password')}
                    className="w-full bg-slate-700/60 border border-slate-600 text-white rounded-lg px-3 py-2.5 ps-10 text-sm placeholder-slate-500 text-start focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-red-400 text-xs">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              {globalError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                  <p className="text-red-400 text-sm leading-snug">{globalError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? 'جارٍ تسجيل الدخول…' : 'تسجيل الدخول'}
              </button>
            </form>
          )}

          {/* ── Forced first-password reset ── */}
          {isReset && (
            <form onSubmit={resetForm.handleSubmit(onReset)} className="px-8 py-7 space-y-5">

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">كلمة المرور الجديدة</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    dir="ltr"
                    {...resetForm.register('newPassword')}
                    className="w-full bg-slate-700/60 border border-slate-600 text-white rounded-lg px-3 py-2.5 ps-10 text-sm placeholder-slate-500 text-start focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {resetForm.formState.errors.newPassword && (
                  <p className="text-red-400 text-xs">{resetForm.formState.errors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">تأكيد كلمة المرور</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  dir="ltr"
                  {...resetForm.register('confirm')}
                  className="w-full bg-slate-700/60 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm placeholder-slate-500 text-start focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-colors"
                />
                {resetForm.formState.errors.confirm && (
                  <p className="text-red-400 text-xs">{resetForm.formState.errors.confirm.message}</p>
                )}
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل، وحرف كبير واحد، ورقم واحد.
              </p>

              {globalError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                  <p className="text-red-400 text-sm leading-snug">{globalError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? 'جارٍ الحفظ…' : 'حفظ ومتابعة'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-slate-600 text-sm">
          <a href="/" className="hover:text-slate-400 transition-colors">
            ← العودة إلى الموقع الرئيسي
          </a>
        </p>
      </div>
    </div>
  );
}
