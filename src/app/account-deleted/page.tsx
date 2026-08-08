'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { DELETION_REREGISTER_NOTE, takeDeletionFarewell } from '@/lib/account-deletion';

/**
 * Where a SELF-DELETED account lands. The settings flow clears the session, stashes the
 * freed phone and replaces the route with this one.
 *
 * Not /account-blocked: that screen is for moderation — it opens with «تواصل معنا إذا
 * كان لديك اعتراض», which is the wrong thing to say to someone who just chose this.
 * The tone here is a receipt, not a refusal: it confirms the deletion, names the phone
 * that is free again, and offers the way back in.
 *
 * The path sits OUTSIDE the /account prefix on purpose — `requiresAuth` matches
 * '/account' and '/account/…', so /account-deleted stays public and cannot bounce a
 * just-logged-out visitor to /login. Same trick as /account-blocked.
 *
 * Reached only via that redirect: the payload is consumed on read, so a direct visit or
 * a refresh has nothing to show and goes home rather than claiming an account was
 * deleted.
 */
export default function AccountDeletedPage() {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const f = takeDeletionFarewell();
    if (!f) {
      router.replace('/');
      return;
    }
    setPhone(f.freedPhone);
    setChecked(true);
  }, [router]);

  if (!checked) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-card shadow-pebble p-8 text-center">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-green-50">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>

        <h1 className="mt-5 text-xl font-bold text-gray-900">تم حذف حسابك</h1>
        <p className="mt-2.5 text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
          تم إيقاف حسابك وإخفاء إعلاناتك. شكراً لاستخدامك فرصة.
        </p>

        {/* The freed phone, when the backend named it: the one fact that makes the
            re-registration promise concrete instead of theoretical. LTR + tabular so
            the digits read correctly inside the Arabic page. */}
        {phone && (
          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-bold text-gray-500 mb-1">رقم متاح للتسجيل من جديد</p>
            <p dir="ltr" className="text-base font-bold text-gray-900 tabular-nums">{phone}</p>
          </div>
        )}

        <p className="mt-4 text-xs text-gray-500 leading-relaxed">{DELETION_REREGISTER_NOTE}</p>

        <Link
          href="/"
          className="mt-6 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
        >
          العودة إلى الصفحة الرئيسية
        </Link>
        <Link
          href="/register"
          className="mt-2 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          إنشاء حساب جديد
        </Link>
      </div>
    </div>
  );
}
