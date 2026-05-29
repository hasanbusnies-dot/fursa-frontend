'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, AlertCircle, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { FormError } from '@/components/ui/FormError';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const COUNTRY_CODES = [
  { code: '+963', country: 'سوريا',     flag: '🇸🇾' },
  { code: '+90',  country: 'تركيا',     flag: '🇹🇷' },
  { code: '+961', country: 'لبنان',     flag: '🇱🇧' },
  { code: '+962', country: 'الأردن',    flag: '🇯🇴' },
  { code: '+964', country: 'العراق',    flag: '🇮🇶' },
  { code: '+20',  country: 'مصر',       flag: '🇪🇬' },
  { code: '+966', country: 'السعودية',  flag: '🇸🇦' },
  { code: '+971', country: 'الإمارات', flag: '🇦🇪' },
  { code: '+49',  country: 'ألمانيا',   flag: '🇩🇪' },
  { code: '+46',  country: 'السويد',    flag: '🇸🇪' },
  { code: '+31',  country: 'هولندا',    flag: '🇳🇱' },
];

type AccountType = 'INDIVIDUAL' | 'CORPORATE';

const schema = z
  .object({
    accountType:     z.enum(['INDIVIDUAL', 'CORPORATE']),
    firstName:       z.string().min(2, 'الاسم الأول يجب أن يكون حرفين على الأقل'),
    lastName:        z.string().min(2, 'الاسم الأخير يجب أن يكون حرفين على الأقل'),
    email:           z.string().email('يرجى إدخال بريد إلكتروني صحيح'),
    phone:           z.string().regex(/^[+\d\s().-]{7,20}$/, 'يرجى إدخال رقم هاتف صحيح'),
    password:        z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
    confirmPassword: z.string(),
    companyName:     z.string().optional(),
    taxNumber:       z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'كلمتا المرور غير متطابقتين',
    path: ['confirmPassword'],
  })
  .refine(
    (d) => d.accountType !== 'CORPORATE' || (d.companyName ?? '').trim().length >= 2,
    { message: 'اسم الشركة مطلوب', path: ['companyName'] }
  )
  .refine(
    (d) => d.accountType !== 'CORPORATE' || (d.taxNumber ?? '').trim().length >= 5,
    { message: 'الرقم الضريبي يجب أن يكون 5 أحرف على الأقل', path: ['taxNumber'] }
  );

type FormData = z.infer<typeof schema>;

const TABS: { type: AccountType; label: string; Icon: React.ElementType }[] = [
  { type: 'INDIVIDUAL', label: 'فردي',    Icon: User      },
  { type: 'CORPORATE',  label: 'شركات',   Icon: Building2 },
];

export function RegisterForm() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [accountType,        setAccountType]        = useState<AccountType>('INDIVIDUAL');
  const [showPassword,       setShowPassword]       = useState(false);
  const [showConfirm,        setShowConfirm]        = useState(false);
  const [serverError,        setServerError]        = useState<string | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState('+963');
  const [localPhone,          setLocalPhone]          = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { accountType: 'INDIVIDUAL' },
  });

  const switchTab = (type: AccountType) => {
    setAccountType(type);
    setValue('accountType', type);
    if (type === 'INDIVIDUAL') clearErrors(['companyName', 'taxNumber']);
  };

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const base = {
        firstName: data.firstName,
        lastName:  data.lastName,
        email:     data.email,
        password:  data.password,
        phone:     `${selectedCountryCode}${data.phone}`,
      };

      const res =
        data.accountType === 'CORPORATE'
          ? await authService.registerCorporate({
              ...base,
              companyName: data.companyName!,
              taxNumber:   data.taxNumber!,
            })
          : await authService.registerIndividual(base);

      setAuth(res.user, res.token);
      toast.success('تم إنشاء حسابك بنجاح! مرحباً بك في فرصة.');
      router.push('/');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.errors && Object.keys(err.errors).length > 0) {
        Object.entries(err.errors).forEach(([field, messages]) => {
          setError(field as keyof FormData, { type: 'server', message: messages[0] });
        });
      } else {
        setServerError(
          err instanceof Error ? err.message : 'فشل التسجيل. يرجى المحاولة مجدداً.'
        );
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">أنشئ حسابك</h1>
        <p className="mt-1 text-sm text-gray-500">
          انضم إلى آلاف المشترين والبائعين على منصة فرصة
        </p>
      </div>

      {/* ── Account type toggle ── */}
      <div className="flex p-1 bg-gray-100 rounded-xl mb-6 gap-1">
        {TABS.map(({ type, label, Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => switchTab(type)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all',
              accountType === type
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        )}

        {/* Hidden accountType field */}
        <input type="hidden" {...register('accountType')} />

        {/* ── Corporate-only fields ── */}
        {accountType === 'CORPORATE' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <div>
              <Label htmlFor="companyName" required>اسم الشركة</Label>
              <Input
                id="companyName"
                autoComplete="organization"
                placeholder="شركة فرصة للتجارة"
                error={!!errors.companyName}
                {...register('companyName')}
              />
              <FormError message={errors.companyName?.message} />
            </div>
            <div>
              <Label htmlFor="taxNumber" required>الرقم الضريبي</Label>
              <Input
                id="taxNumber"
                placeholder="SY-12345678"
                error={!!errors.taxNumber}
                {...register('taxNumber')}
              />
              <FormError message={errors.taxNumber?.message} />
            </div>
          </div>
        )}

        {/* ── Name fields ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName" required>الاسم الأول</Label>
            <Input
              id="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="مثال: أحمد"
              error={!!errors.firstName}
              {...register('firstName')}
            />
            <FormError message={errors.firstName?.message} />
          </div>
          <div>
            <Label htmlFor="lastName" required>الاسم الأخير</Label>
            <Input
              id="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="مثال: الحسن"
              error={!!errors.lastName}
              {...register('lastName')}
            />
            <FormError message={errors.lastName?.message} />
          </div>
        </div>

        {/* ── Email ── */}
        <div>
          <Label htmlFor="reg-email" required>البريد الإلكتروني</Label>
          <Input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            error={!!errors.email}
            {...register('email')}
          />
          <FormError message={errors.email?.message} />
        </div>

        {/* ── Phone ── */}
        <div>
          <Label htmlFor="phone" required>رقم الهاتف</Label>
          <div
            className={cn(
              'flex items-center rounded-lg border bg-white transition-colors',
              'focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500',
              errors.phone ? 'border-red-400' : 'border-gray-300'
            )}
            dir="ltr"
          >
            <select
              value={selectedCountryCode}
              onChange={(e) => {
                setSelectedCountryCode(e.target.value);
                setValue('phone', localPhone, { shouldValidate: !!localPhone });
              }}
              className="shrink-0 bg-gray-50 border-none outline-none py-2.5 ps-2 pe-1 text-sm text-gray-700 cursor-pointer rounded-s-lg"
              aria-label="رمز الدولة"
            >
              {COUNTRY_CODES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.flag} {item.code}
                </option>
              ))}
            </select>
            <div className="w-px self-stretch bg-gray-200" />
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              placeholder="9XX XXX XXXX"
              autoComplete="tel-national"
              dir="ltr"
              value={localPhone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                setLocalPhone(digits);
                setValue('phone', digits, { shouldValidate: true });
              }}
              className="w-full border-none outline-none py-2.5 px-3 text-sm bg-transparent text-gray-900 placeholder-gray-400"
            />
          </div>
          <FormError message={errors.phone?.message} />
        </div>

        {/* ── Password ── */}
        <div>
          <Label htmlFor="reg-password" required>كلمة المرور</Label>
          <div className="relative">
            <Input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="8 أحرف كحد أدنى"
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

        {/* ── Confirm password ── */}
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
              className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <FormError message={errors.confirmPassword?.message} />
        </div>

        {/* ── Terms ── */}
        <p className="text-xs text-gray-500 pt-1">
          بتسجيلك، فإنك توافق على{' '}
          <Link href="/terms" className="text-blue-600 hover:underline">شروط الخدمة</Link>
          {' '}و{' '}
          <Link href="/privacy" className="text-blue-600 hover:underline">سياسة الخصوصية</Link>
          {' '}الخاصة بفرصة.
        </p>

        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          إنشاء حساب
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        لديك حساب بالفعل؟{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700 transition-colors">
          تسجيل الدخول
        </Link>
      </p>
    </div>
  );
}
