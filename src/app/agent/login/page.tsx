'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { HandCoins, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/services/api';

const schema = z.object({
  identifier: z.string().min(1, 'أدخل البريد الإلكتروني أو رقم الهاتف'),
  password:   z.string().min(1, 'كلمة المرور مطلوبة'),
});
type FormData = z.infer<typeof schema>;

export default function AgentLoginPage() {
  const router = useRouter();
  const { setAuth, logout } = useAuthStore();

  const [isLoading,    setIsLoading]    = useState(false);
  const [globalError,  setGlobalError]  = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setGlobalError('');

    try {
      // Step 1 — authenticate and store token so the profile call is authed.
      const { token, refreshToken, user: loginUser } = await authService.login({
        identifier: data.identifier,
        password:   data.password,
      });
      setAuth(loginUser, token, refreshToken);

      // Step 2 — fetch fresh profile for the live role (the login JWT may lag).
      let finalUser = loginUser;
      try {
        finalUser = await authService.getProfile();
        setAuth(finalUser, token, refreshToken);
      } catch {
        // /users/me unavailable — fall back to the role from the login response.
      }

      // Step 3 — role gate.
      if (finalUser.userType !== 'FIELD_AGENT') {
        setGlobalError('الدخول مرفوض. هذه البوابة مخصّصة لمندوبي التحصيل فقط.');
        logout();
        return;
      }

      toast.success(`أهلاً، ${finalUser.profile?.firstName ?? 'مندوب'}.`);
      router.replace('/agent/collect');
    } catch (err) {
      setGlobalError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'بيانات الدخول غير صحيحة. حاول مرة أخرى.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-16" dir="rtl">
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">

          {/* Header strip */}
          <div className="bg-gradient-to-l from-teal-600 to-teal-800 px-8 py-6 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <HandCoins className="w-6 h-6 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold text-white tracking-tight">لوحة المندوب</h1>
              <p className="text-teal-200 text-xs mt-0.5">مخصّصة لمندوبي التحصيل</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-7 space-y-5">

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">
                البريد الإلكتروني أو الهاتف
              </label>
              <input
                type="text"
                autoComplete="username"
                placeholder="agent@forsa.com"
                dir="ltr"
                {...register('identifier')}
                className="w-full bg-slate-700/60 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm placeholder-slate-500 text-start focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-colors"
              />
              {errors.identifier && (
                <p className="text-red-400 text-xs">{errors.identifier.message}</p>
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
                  {...register('password')}
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
              {errors.password && (
                <p className="text-red-400 text-xs">{errors.password.message}</p>
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
