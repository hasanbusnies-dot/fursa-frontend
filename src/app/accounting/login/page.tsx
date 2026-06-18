'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Calculator, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/services/api';

const schema = z.object({
  email:    z.string().email('Geçerli bir e-posta girin'),
  password: z.string().min(1, 'Şifre gerekli'),
});
type FormData = z.infer<typeof schema>;

export default function AccountingLoginPage() {
  const router = useRouter();
  const { setAuth, logout } = useAuthStore();

  const [isLoading, setIsLoading]       = useState(false);
  const [globalError, setGlobalError]   = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setGlobalError('');
    try {
      const { token, refreshToken, user: loginUser } = await authService.login({
        identifier: data.email,
        password:   data.password,
      });
      setAuth(loginUser, token, refreshToken);

      // Fetch the live role from the DB (the login JWT may lag a role change).
      let finalUser = loginUser;
      try {
        finalUser = await authService.getProfile();
        setAuth(finalUser, token, refreshToken);
      } catch { /* /auth/me unavailable — use the login role */ }

      // ACCOUNTANT or ADMIN may enter; anyone else is denied.
      if (finalUser.userType !== 'ACCOUNTANT' && finalUser.userType !== 'ADMIN') {
        setGlobalError('Erişim reddedildi. Bu portal yalnızca muhasebe içindir.');
        logout();
        return;
      }

      toast.success(`Hoş geldiniz, ${finalUser.profile?.firstName ?? 'Muhasebe'}.`);
      router.push('/accounting');
    } catch (err) {
      setGlobalError(
        err instanceof ApiError || err instanceof Error ? err.message : 'Giriş başarısız. Tekrar deneyin.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 px-8 py-6 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold text-white tracking-tight">Muhasebe Portalı</h1>
              <p className="text-emerald-300 text-xs mt-0.5">Yalnızca yetkili personel</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-7 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">E-posta</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="muhasebe@forsa.com"
                {...register('email')}
                className="w-full bg-slate-700/60 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
              />
              {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Şifre</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full bg-slate-700/60 border border-slate-600 text-white rounded-lg px-3 py-2.5 pr-10 text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
            </div>

            {globalError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                <p className="text-red-400 text-sm leading-snug">{globalError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Giriş yapılıyor…' : 'Muhasebe Paneline Giriş'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-slate-600 text-sm">
          <a href="/" className="hover:text-slate-400 transition-colors">← Ana siteye dön</a>
        </p>
      </div>
    </div>
  );
}
