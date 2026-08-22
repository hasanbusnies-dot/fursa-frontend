'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, ArrowRight, MailCheck } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { FormError } from '@/components/ui/FormError';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/services/api';

// One free-text field on purpose: the backend's `forgotPasswordSchema` takes a single
// `identifier` and decides for itself whether it looks like a phone or an email. Adding a
// client-side email/phone discriminator here would only invent a way to reject an
// identifier the server would have accepted.
const schema = z.object({
  identifier: z.string().trim().min(1, 'أدخل بريدك الإلكتروني أو رقم هاتفك'),
});
type FormData = z.infer<typeof schema>;

// THE non-enumeration message. The backend answers with one fixed 200 whether or not an
// account exists — this text is the frontend half of that promise, and it is shown on
// EVERY successful submit. Never make it conditional, never add "no account found", and
// never echo back whether the identifier matched: the whole point is that a stranger
// walking a list of Syrian phone numbers learns nothing about which ones hold accounts.
const GENERIC_SUCCESS =
  'إذا كان هناك حساب مرتبط بهذا البريد أو الرقم، فسنرسل رابط إعادة التعيين إلى بريده الإلكتروني.';

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await authService.forgotPassword(data.identifier);
      setSent(true);
    } catch (err) {
      // 429 is safe to report plainly: both limiters count a request for an UNREGISTERED
      // identifier exactly like one for a real account, so being rate-limited says
      // nothing about whether the account exists.
      if (err instanceof ApiError && err.status === 429) {
        setServerError('لقد طلبت روابط كثيرة خلال وقت قصير. انتظر قليلاً ثم حاول مجدداً.');
        return;
      }
      // Anything else is a transport/server failure — surfacing it is honest and, again,
      // outcome-independent. Silently showing the success screen here would leave a user
      // waiting for an email that was never sent.
      setServerError('تعذّر إرسال الطلب — تحقق من اتصالك وحاول مجدداً.');
    }
  };

  // ── Sent: identical screen for every identifier, existing or not ──
  if (sent) {
    return (
      <div className="bg-white rounded-card shadow-pebble p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
            <MailCheck className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">تحقّق من بريدك</h1>
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">{GENERIC_SUCCESS}</p>
          <p className="mt-3 text-xs text-gray-400 leading-relaxed">
            الرابط صالح لمدة ساعة واحدة. إن لم تجد الرسالة، تحقّق من مجلد البريد المزعج.
          </p>

          <Link href="/login" className="w-full mt-7">
            <Button className="w-full" size="lg" variant="secondary">
              العودة إلى تسجيل الدخول
            </Button>
          </Link>

          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-4 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            لم تصلك الرسالة؟ جرّب بريداً أو رقماً آخر
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-card shadow-pebble p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">نسيت كلمة المرور؟</h1>
        <p className="mt-1 text-sm text-gray-500">
          أدخل بريدك الإلكتروني أو رقم هاتفك، وسنرسل رابط إعادة التعيين إلى البريد
          الإلكتروني المرتبط بحسابك.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {serverError && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        )}

        <div>
          <Label htmlFor="identifier" required>البريد الإلكتروني أو رقم الهاتف</Label>
          <Input
            id="identifier"
            type="text"
            autoComplete="username"
            placeholder="example@email.com"
            error={!!errors.identifier}
            {...register('identifier')}
          />
          <FormError message={errors.identifier?.message} />
        </div>

        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          إرسال رابط إعادة التعيين
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          العودة إلى تسجيل الدخول
        </Link>
      </p>
    </div>
  );
}
