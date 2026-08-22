import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

// The emailed link lands here as /reset-password?token=… (password-reset.service.ts's
// buildResetUrl). Never index it — the URL carries a live single-use credential.
export const metadata: Metadata = {
  title: 'تعيين كلمة مرور جديدة',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
