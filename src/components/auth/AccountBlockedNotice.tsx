'use client';

import Link from 'next/link';
import { Ban, Clock, MessageCircle, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCOUNT_BLOCK_COPY, type AccountBlockCode } from '@/lib/account-block';

// The screen a blocked user sees instead of an English error. Used in two places:
//   • inline, replacing the login form, when POST /auth/login is refused (403)
//   • full-page at /account-blocked, after a mid-session freeze logs them out (401)
// Same component both times so the two moments read identically.

const ICONS: Record<AccountBlockCode, React.ElementType> = {
  ACCOUNT_SUSPENDED: Clock,
  ACCOUNT_BANNED: ShieldX,
  ACCOUNT_DELETED: Ban,
};

export function AccountBlockedNotice({
  code,
  reason,
  onBack,
  className,
}: {
  code: AccountBlockCode;
  /** The moderating admin's note. Null when none was recorded — the line is then omitted
   *  entirely rather than rendered empty or as "null". */
  reason: string | null;
  /** Rendered as a secondary action when provided (login page: try another account). */
  onBack?: () => void;
  className?: string;
}) {
  const copy = ACCOUNT_BLOCK_COPY[code];
  const Icon = ICONS[code];
  const tone = copy.permanent
    ? { ring: 'bg-red-50', fg: 'text-red-600', box: 'bg-red-50 border-red-200', label: 'text-red-800' }
    : { ring: 'bg-amber-50', fg: 'text-amber-600', box: 'bg-amber-50 border-amber-200', label: 'text-amber-800' };

  return (
    <div className={cn('bg-white rounded-card shadow-pebble p-8 text-center', className)}>
      <div className={cn('w-16 h-16 rounded-2xl mx-auto flex items-center justify-center', tone.ring)}>
        <Icon className={cn('w-8 h-8', tone.fg)} />
      </div>

      <h1 className="mt-5 text-xl font-bold text-gray-900">{copy.title}</h1>
      <p className="mt-2.5 text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">{copy.body}</p>

      {/* The admin's own words. Shown verbatim — this is the only place the user learns
          what they actually did. Omitted when the backend sent reason: null. */}
      {reason && (
        <div className={cn('mt-5 rounded-xl border p-4 text-start', tone.box)}>
          <p className={cn('text-xs font-bold mb-1', tone.label)}>السبب</p>
          <p className="text-sm text-gray-700 break-words whitespace-pre-line">{reason}</p>
        </div>
      )}

      <Link
        href="/contact"
        className="mt-6 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
      >
        <MessageCircle className="w-4 h-4" />
        تواصل معنا
      </Link>

      <div className="mt-3 flex items-center justify-center gap-4 text-xs">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="font-semibold text-gray-500 hover:text-gray-700 transition-colors"
          >
            الدخول بحساب آخر
          </button>
        )}
        <Link href="/" className="font-semibold text-gray-500 hover:text-gray-700 transition-colors">
          العودة إلى الرئيسية
        </Link>
      </div>
    </div>
  );
}
