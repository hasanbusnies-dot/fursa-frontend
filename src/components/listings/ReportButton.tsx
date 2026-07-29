'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Flag, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import {
  REPORT_DETAILS_MAX,
  REPORT_DETAILS_MIN,
  isAlreadyReported,
  isOwnListing,
  isRateLimited,
  reportsService,
  type ReportReason,
  type ReportReasonOption,
} from '@/services/reports.service';

/**
 * «الإبلاغ عن إعلان مخالف» — reason picker + optional detail, in the listing detail
 * action row.
 *
 * Hidden entirely for the listing's own owner (the backend 400s that anyway). Logged-out
 * users still SEE it — it is how they learn reporting exists — and are sent to /login
 * with a redirect back, matching the add-listing guard.
 */
export function ReportButton({
  listingId,
  sellerId,
  className,
}: {
  listingId: string;
  sellerId?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authUser = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);

  // Own listing → no affordance at all.
  if (isAuthenticated && sellerId && authUser?.id === sellerId) return null;

  const handleClick = () => {
    if (!isAuthenticated) {
      toast.error('يجب تسجيل الدخول للإبلاغ عن إعلان.');
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setOpen(true);
  };

  return (
    <>
      {open && <ReportModal listingId={listingId} onClose={() => setOpen(false)} />}
      <button
        type="button"
        onClick={handleClick}
        title="الإبلاغ عن إعلان مخالف"
        className={cn(
          'flex items-center gap-2 text-sm font-semibold py-2.5 px-5 rounded-xl border transition-all whitespace-nowrap',
          // Quieter than favourite/compare/share: this sits beside positive actions and
          // must not compete with them for attention.
          'bg-gray-50 text-gray-500 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200',
          className,
        )}
      >
        <Flag className="w-4 h-4" />
        الإبلاغ عن إعلان مخالف
      </button>
    </>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────────
// Follows the reason-required dialogs elsewhere (RejectModal, SuspendModal): same
// overlay, same header, same cancel/confirm pair.

function ReportModal({ listingId, onClose }: { listingId: string; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  // Reasons come from GET /reports/reasons — never a hardcoded copy, which drifts from
  // the backend's wording and from the labels the admin queue renders.
  const [options, setOptions] = useState<ReportReasonOption[] | null>(null);
  const [optionsError, setOptionsError] = useState(false);

  const loadReasons = () => {
    setOptionsError(false);
    reportsService.getReasons()
      .then(setOptions)
      .catch(() => setOptionsError(true));
  };

  useEffect(loadReasons, []);

  const trimmed = details.trim();
  // Optional — but the backend rejects 1–9 characters, so "started typing and stopped"
  // must be caught here rather than surfacing as an English 400.
  const detailsTooShort = trimmed.length > 0 && trimmed.length < REPORT_DETAILS_MIN;
  const ready = !!reason && !detailsTooShort && !saving;

  const submit = async () => {
    if (!reason || !ready) return;
    setSaving(true);
    try {
      await reportsService.create(listingId, { reason, details: trimmed || undefined });
      setDone(true);
    } catch (err) {
      if (isAlreadyReported(err)) {
        setBlocked('لقد أبلغت عن هذا الإعلان مسبقاً.');
      } else if (isOwnListing(err)) {
        setBlocked('لا يمكنك الإبلاغ عن إعلانك الخاص.');
      } else if (isRateLimited(err)) {
        // The 20/hour per-user limiter. The server's message is already Arabic.
        setBlocked(err instanceof Error ? err.message : 'لقد أرسلت عدداً كبيراً من البلاغات. يرجى المحاولة لاحقاً.');
      } else {
        toast.error(err instanceof Error ? err.message : 'تعذّر إرسال البلاغ. حاول مجدداً.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', done ? 'bg-green-50' : 'bg-red-50')}>
              {done
                ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                : <Flag className="w-4 h-4 text-red-500" />}
            </div>
            <h3 className="text-sm font-bold text-gray-900">
              {done ? 'تم إرسال البلاغ' : 'الإبلاغ عن إعلان مخالف'}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        {done ? (
          <div className="text-center py-4">
            <p className="text-sm font-semibold text-gray-900">تم إرسال البلاغ، شكراً لك.</p>
            <p className="mt-1.5 text-xs text-gray-500">سيراجع فريقنا الإعلان ويتخذ الإجراء المناسب.</p>
            <button
              onClick={onClose}
              className="mt-5 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              إغلاق
            </button>
          </div>
        ) : blocked ? (
          // Terminal states (already reported / own listing): no retry affordance, because
          // resubmitting cannot succeed.
          <div className="text-center py-4">
            <p className="text-sm font-semibold text-gray-900">{blocked}</p>
            <button
              onClick={onClose}
              className="mt-5 w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              إغلاق
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-3">اختر سبب البلاغ:</p>

            {optionsError ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <AlertTriangle className="w-6 h-6 text-gray-300" />
                <p className="text-xs text-gray-500">تعذّر تحميل أسباب البلاغ.</p>
                <button onClick={loadReasons} className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline">
                  إعادة المحاولة
                </button>
              </div>
            ) : !options ? (
              <div className="space-y-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-11 rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {options.map((o) => (
                  <label
                    key={o.value}
                    className={cn(
                      'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-colors',
                      reason === o.value
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-200 hover:bg-gray-50',
                    )}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={o.value}
                      checked={reason === o.value}
                      onChange={() => setReason(o.value)}
                      className="w-4 h-4 accent-red-600 shrink-0"
                    />
                    <span className={cn('text-sm', reason === o.value ? 'font-semibold text-red-800' : 'text-gray-700')}>
                      {o.labelAr}
                    </span>
                  </label>
                ))}
              </div>
            )}

            <label className="block text-xs font-semibold text-gray-700 mt-4 mb-1.5">
              تفاصيل إضافية <span className="font-normal text-gray-400">(اختياري)</span>
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              maxLength={REPORT_DETAILS_MAX}
              placeholder="وضّح المخالفة إن أردت…"
              className={cn(
                'block w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors resize-none',
                detailsTooShort
                  ? 'border-red-400 focus:ring-red-200'
                  : 'border-gray-300 focus:ring-red-200 focus:border-red-400',
              )}
            />
            {detailsTooShort && (
              <p className="mt-1.5 text-xs text-red-600">
                التفاصيل يجب أن تكون {REPORT_DETAILS_MIN} أحرف على الأقل، أو اتركها فارغة.
              </p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={onClose}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={submit}
                disabled={!ready}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                إرسال البلاغ
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
