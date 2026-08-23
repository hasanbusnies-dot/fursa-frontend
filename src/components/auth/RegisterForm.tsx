'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, AlertCircle, User, Building2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { FormError } from '@/components/ui/FormError';
import { PhoneField, DEFAULT_DIAL_CODE } from '@/components/ui/PhoneField';
import { authService } from '@/services/auth.service';
import { COMPANY_TYPE_AR, type CompanyType } from '@/services/stores.service';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

type AccountType = 'INDIVIDUAL' | 'CORPORATE';

// The five business types, in the picker's order. Labels come from the shared
// COMPANY_TYPE_AR so signup, the agent form and the admin detail always agree.
const COMPANY_TYPE_OPTIONS: CompanyType[] = [
  'CAR_SHOWROOM', 'REAL_ESTATE_AGENCY', 'STORE', 'SERVICES', 'OTHER',
];

// Backend parity (auth.schemas.ts). The phone rule applies to the COMPOSED
// «countryCode + localDigits» string, not the local part alone — a 15-digit local
// number behind '+963' is 19 chars and the API rejects it at 16.
const PHONE_MIN = 8;
const PHONE_MAX = 16;

const schema = z
  .object({
    accountType:  z.enum(['INDIVIDUAL', 'CORPORATE']),
    countryCode:  z.string().min(1),
    // Individual-only (see superRefine) — a business has no person name on the API.
    firstName:    z.string().optional(),
    lastName:     z.string().optional(),
    email:        z.string().email('يرجى إدخال بريد إلكتروني صحيح'),
    phone:        z.string().regex(/^\d+$/, 'يجب أن يحتوي رقم الهاتف على أرقام فقط'),
    password: z
      .string()
      .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      .regex(/[A-Z]/, 'يجب أن تحتوي على حرف إنجليزي كبير واحد على الأقل (A-Z)')
      .regex(/[0-9]/, 'يجب أن تحتوي على رقم واحد على الأقل'),
    confirmPassword: z.string(),
    // Corporate-only
    companyName:  z.string().optional(),
    companyType:  z.string().optional(),
    taxNumber:    z.string().optional(),
    // NOT .default(false): a defaulted field makes zod's INPUT type differ from its
    // OUTPUT type, and react-hook-form's resolver generic then rejects the schema.
    // The initial value comes from defaultValues below instead.
    taxExempt:    z.boolean(),
  })
  .superRefine((d, ctx) => {
    const issue = (path: keyof typeof d, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    if (d.password !== d.confirmPassword) {
      issue('confirmPassword', 'كلمتا المرور غير متطابقتين');
    }

    const full = `${d.countryCode}${d.phone}`;
    if (full.length < PHONE_MIN) issue('phone', 'رقم الهاتف قصير جداً');
    if (full.length > PHONE_MAX) issue('phone', 'رقم الهاتف طويل جداً');

    if (d.accountType === 'INDIVIDUAL') {
      if ((d.firstName ?? '').trim().length < 2) issue('firstName', 'الاسم الأول يجب أن يكون حرفين على الأقل');
      if ((d.lastName ?? '').trim().length < 2)  issue('lastName',  'الاسم الأخير يجب أن يكون حرفين على الأقل');
      return;
    }

    if ((d.companyName ?? '').trim().length < 2) issue('companyName', 'اسم الشركة مطلوب');
    if (!d.companyType) issue('companyType', 'يرجى اختيار نوع النشاط');
    // Exempt is the explicit alternative to a number — one or the other, never both
    // (the API 400s on «taxExempt && taxNumber»).
    if (!d.taxExempt) {
      const t = (d.taxNumber ?? '').trim();
      if (!t) issue('taxNumber', 'أدخل الرقم الضريبي أو اختر «معفى»');
      else if (t.length > 50) issue('taxNumber', 'حد أقصى 50 حرفاً');
    }
  });

type FormData = z.infer<typeof schema>;

// Every key the form can actually render an error on. A server error keyed to
// anything else (a contract field we don't collect) must fall through to the banner
// instead of vanishing into setError on a non-existent field — that silent failure is
// exactly what made corporate signup look like a dead button.
const FORM_FIELDS = new Set<string>([
  'firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword',
  'companyName', 'companyType', 'taxNumber', 'taxExempt',
]);

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
  const [selectedCountryCode, setSelectedCountryCode] = useState(DEFAULT_DIAL_CODE);
  const [localPhone,          setLocalPhone]          = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { accountType: 'INDIVIDUAL', countryCode: DEFAULT_DIAL_CODE, taxExempt: false },
  });

  const taxExempt = watch('taxExempt');

  const switchTab = (type: AccountType) => {
    setAccountType(type);
    setValue('accountType', type);
    clearErrors(
      type === 'INDIVIDUAL'
        ? ['companyName', 'companyType', 'taxNumber']
        : ['firstName', 'lastName'],
    );
  };

  // Checking «معفى» clears + locks the tax input; unchecking hands it back.
  const toggleExempt = (checked: boolean) => {
    setValue('taxExempt', checked);
    if (checked) {
      setValue('taxNumber', '');
      clearErrors('taxNumber');
    }
  };

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const phone = `${selectedCountryCode}${data.phone}`;

      const res =
        data.accountType === 'CORPORATE'
          ? await authService.registerCorporate({
              phone,
              email:       data.email,
              password:    data.password,
              companyName: data.companyName!.trim(),
              companyType: data.companyType as CompanyType,
              // Mutually exclusive — send exactly one.
              ...(data.taxExempt
                ? { taxExempt: true }
                : { taxNumber: data.taxNumber!.trim() }),
            })
          : await authService.registerIndividual({
              firstName: data.firstName!.trim(),
              lastName:  data.lastName!.trim(),
              email:     data.email,
              password:  data.password,
              phone,
            });

      setAuth(res.user, res.token, res.refreshToken);

      if (data.accountType === 'CORPORATE') {
        // The account is live and logged in; the STORE is what awaits approval.
        toast.success('تم إرسال حسابك للمراجعة', {
          description: 'سنراجع بيانات نشاطك قريباً. تُفتح أقسام المتجر وإضافة الإعلانات والمحفظة فور الموافقة.',
          duration: 8000,
        });
        router.push('/account');
      } else {
        toast.success('تم إنشاء حسابك بنجاح! مرحباً بك في فرصة.');
        router.push('/');
      }
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.errors && Object.keys(err.errors).length > 0) {
        const unmapped: string[] = [];
        Object.entries(err.errors).forEach(([field, messages]) => {
          if (FORM_FIELDS.has(field)) {
            setError(field as keyof FormData, { type: 'server', message: messages[0] });
          } else {
            unmapped.push(messages[0]);
          }
        });
        // Never swallow an error we have nowhere to render.
        if (unmapped.length > 0) setServerError(unmapped.join(' · '));
      } else {
        setServerError(
          err instanceof Error ? err.message : 'فشل التسجيل. يرجى المحاولة مجدداً.'
        );
      }
    }
  };

  const isCorporate = accountType === 'CORPORATE';

  return (
    <div className="bg-white rounded-card shadow-pebble p-8">
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

        {/* Hidden fields the schema reads but the user never types into */}
        <input type="hidden" {...register('accountType')} />
        <input type="hidden" {...register('countryCode')} />

        {/* ── Corporate-only fields ── */}
        {isCorporate && (
          <div className="space-y-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Label htmlFor="companyType" required>نوع النشاط</Label>
                <select
                  id="companyType"
                  defaultValue=""
                  className={cn(
                    'block w-full px-3.5 py-2.5 rounded-field border bg-input-bg text-[16px]',
                    'transition-colors focus:outline-none focus:ring-4 focus:bg-white',
                    errors.companyType
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                      : 'border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-blue-100',
                  )}
                  {...register('companyType')}
                >
                  <option value="" disabled>اختر نوع النشاط</option>
                  {COMPANY_TYPE_OPTIONS.map((value) => (
                    <option key={value} value={value}>{COMPANY_TYPE_AR[value]}</option>
                  ))}
                </select>
                <FormError message={errors.companyType?.message} />
              </div>
            </div>

            {/* Tax number + the exemption escape hatch */}
            <div>
              <Label htmlFor="taxNumber" required={!taxExempt}>الرقم الضريبي</Label>
              <Input
                id="taxNumber"
                placeholder={taxExempt ? '—' : 'SY-12345678'}
                disabled={taxExempt}
                aria-disabled={taxExempt}
                error={!!errors.taxNumber}
                className={cn(taxExempt && 'bg-gray-100 text-gray-400 cursor-not-allowed')}
                {...register('taxNumber')}
              />
              <FormError message={errors.taxNumber?.message} />

              <label className="mt-2 flex items-center gap-2 cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  checked={taxExempt}
                  onChange={(e) => toggleExempt(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs text-gray-600">ليس لدي رقم ضريبي / معفى</span>
              </label>
            </div>

            <p className="flex items-start gap-2 text-xs text-blue-800 bg-blue-100/60 rounded-lg p-2.5">
              <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              يُراجع فريقنا حسابات الأعمال قبل تفعيلها. ستتمكن من تصفح المنصة فوراً، وتُفتح أقسام
              المتجر وإضافة الإعلانات والمحفظة بعد الموافقة.
            </p>
          </div>
        )}

        {/* ── Name fields (individual only — the API stores no person name for a business) ── */}
        {!isCorporate && (
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
        )}

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
          <PhoneField
            countryCode={selectedCountryCode}
            onCountryCodeChange={(code) => {
              setSelectedCountryCode(code);
              // The composed length is what the API validates — keep the schema's
              // copy of the code in sync so it re-checks against the new prefix.
              setValue('countryCode', code);
              setValue('phone', localPhone, { shouldValidate: !!localPhone });
            }}
            value={localPhone}
            onValueChange={(digits) => {
              setLocalPhone(digits);
              setValue('phone', digits, { shouldValidate: true });
            }}
            error={!!errors.phone}
          />
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
              placeholder="8 أحرف، حرف كبير ورقم"
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
          {isCorporate ? 'إنشاء حساب أعمال' : 'إنشاء حساب'}
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
