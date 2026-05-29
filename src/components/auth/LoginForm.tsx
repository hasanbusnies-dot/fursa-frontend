'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { FormError } from '@/components/ui/FormError';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';

// Zod v4 removed `.email()` from ZodString — use .refine() with a regex instead.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const schema = z.object({
  email: z
    .string()
    .min(1, 'البريد الإلكتروني مطلوب')
    .refine((v) => EMAIL_RE.test(v), { message: 'يرجى إدخال بريد إلكتروني صحيح' }),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

type FormData = z.infer<typeof schema>;

const FIELD_MAP: Partial<Record<string, keyof FormData>> = {
  identifier: 'email',
};

export function LoginForm() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError]   = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const { token, user } = await authService.login({ identifier: data.email, password: data.password });
      setAuth(user, token);
      toast.success(`أهلاً، ${user.profile?.firstName ?? user.email}!`);
      // Honor ?redirect= (set by the add-listing guard) so the user lands back
      // where they came from. Only accept safe, relative in-app paths.
      const redirectTo = new URLSearchParams(window.location.search).get('redirect');
      const safeRedirect =
        redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
          ? redirectTo
          : '/';
      router.push(safeRedirect);
    } catch (err) {
      if (err instanceof ApiError && err.errors && Object.keys(err.errors).length > 0) {
        Object.entries(err.errors).forEach(([field, messages]) => {
          const formField = (FIELD_MAP[field] ?? field) as keyof FormData;
          setError(formField, { type: 'server', message: messages[0] });
        });
      } else {
        setServerError(
          err instanceof Error ? err.message : 'فشل تسجيل الدخول. يرجى المحاولة مجدداً.',
        );
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">أهلاً بعودتك</h1>
        <p className="mt-1 text-sm text-gray-500">سجّل دخولك إلى حساب فرصة</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {serverError && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        )}

        <div>
          <Label htmlFor="email" required>البريد الإلكتروني</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="example@email.com"
            error={!!errors.email}
            {...register('email')}
          />
          <FormError message={errors.email?.message} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label htmlFor="password" required className="mb-0">كلمة المرور</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              نسيت كلمة المرور؟
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              error={!!errors.password}
              className="pe-10"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <FormError message={errors.password?.message} />
        </div>

        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          دخول
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        ليس لديك حساب؟{' '}
        <Link href="/register" className="font-medium text-blue-600 hover:text-blue-700 transition-colors">
          أنشئ حساباً مجاناً
        </Link>
      </p>
    </div>
  );
}
