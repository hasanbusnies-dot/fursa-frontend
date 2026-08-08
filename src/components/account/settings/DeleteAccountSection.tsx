'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, Eye, EyeOff, Loader2, Trash2, Wallet, X,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { ApiError } from '@/services/api';
import {
  usersService,
  type DeletionPreview,
  type DeletionReason,
} from '@/services/users.service';
import {
  ACCOUNT_DELETED_PATH,
  ACCOUNT_DELETION_WARNING_COPY,
  DELETION_CONSEQUENCES,
  DELETION_REASONS,
  DELETION_REREGISTER_NOTE,
  orderedWarnings,
  stashDeletionFarewell,
} from '@/lib/account-deletion';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { inputCls } from './shared';

/**
 * Delete-my-account. Google Play requires the control to be IN the app, not behind a
 * support request, so this is the whole flow: entry point, informed consent, re-auth.
 *
 * THE SHAPE OF THE FRICTION. A destructive action needs friction proportional to what
 * it destroys, but "are you sure?" adds friction without adding information. The
 * deletion-preview endpoint is what makes this honest: instead of a generic warning,
 * the user reads their OWN numbers — the balance they are about to strand, the count
 * of listings about to vanish. That is the signature of this flow, and it is why the
 * facts get a screen to themselves.
 *
 * So: two steps, not one. Step 1 is what it costs, step 2 is authorising it. The
 * password field does not exist until the consequences have been on screen — you
 * should not be able to type your way past a decision you have not been shown. And
 * FILLED red appears exactly once in the entire flow, on the final button; the entry
 * point is outline-red, so the solid fill always means "this is the irreversible one".
 *
 * None of the warnings block. The backend allows deletion regardless, and so does
 * this — the preview exists to inform the decision, not to overrule it.
 */
export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Entry point. Deliberately NOT a SectionCard: the blue icon chip on every other
          settings card says "routine", and this is the one control on the page that
          cannot be undone. Red hairline + red chip, but an OUTLINE button — the fill is
          reserved for the point of no return. */}
      <section className="bg-white rounded-card shadow-pebble p-5 border-t-2 border-red-200">
        <div className="flex items-start gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
            <Trash2 className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">حذف الحساب</h2>
            <p className="text-xs text-gray-400 mt-0.5">إجراء نهائي لا يمكن التراجع عنه</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed">
          عند حذف حسابك يتم إيقافه وإخفاء إعلاناتك وتجميد رصيدك. سنعرض لك ما سيتأثر قبل
          التأكيد.
        </p>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 hover:border-red-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
        >
          <Trash2 className="w-4 h-4" />
          حذف حسابي
        </button>
      </section>

      {open && <DeleteAccountModal onClose={() => setOpen(false)} />}
    </>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
// Same overlay/header/close as ReportModal so it reads as part of the app rather
// than a bespoke screen.

type Step = 'review' | 'confirm';

function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const [step, setStep] = useState<Step>('review');
  const [preview, setPreview] = useState<DeletionPreview | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  const [reason, setReason]     = useState<DeletionReason | ''>('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [pwError, setPwError]   = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPreview = () => {
    setPreviewFailed(false);
    usersService.getDeletionPreview()
      .then(setPreview)
      .catch(() => setPreviewFailed(true));
  };

  useEffect(loadPreview, []);

  // Esc closes — but never mid-request, when the account may already be gone.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !deleting) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleting, onClose]);

  /** Success and 409 land here alike: log out locally, hand off to the farewell. */
  const finish = (freedPhone: string | null) => {
    stashDeletionFarewell({ freedPhone });
    logout();
    router.replace(ACCOUNT_DELETED_PATH);
  };

  const submit = async () => {
    if (!password || deleting) return;
    setPwError(null);
    setFormError(null);
    setDeleting(true);
    try {
      const res = await usersService.deleteAccount(password, reason || undefined);
      finish(res.freedPhone ?? preview?.reRegistrationPhone ?? null);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : undefined;
      if (status === 400) {
        // Generic by design on the backend — it must not reveal which half was wrong.
        setPwError('كلمة المرور غير صحيحة.');
      } else if (status === 403) {
        setFormError('لا يمكن حذف حسابات الإدارة من التطبيق. تواصل معنا لإتمام الطلب.');
      } else if (status === 409) {
        // Already deleted — the session is simply stale. Finishing beats an error
        // screen: the user asked for this state and it is the state they are in.
        finish(preview?.reRegistrationPhone ?? null);
        return;
      } else if (status === 429) {
        setFormError('حاولت كثيراً، انتظر قليلاً ثم أعد المحاولة.');
      } else {
        setFormError('تعذّر حذف الحساب — حاول مجدداً.');
      }
      setDeleting(false);
    }
  };

  const warnings = orderedWarnings(preview?.warnings);
  const balances = (preview?.wallet?.balances ?? []).filter((b) => b.positive);
  const listings = preview?.activeListings ?? 0;
  const topups   = preview?.pendingTopups ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">
              {step === 'review' ? 'قبل حذف حسابك' : 'تأكيد حذف الحساب'}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            aria-label="إغلاق"
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        {step === 'review' ? (
          <>
            {/* ── The facts ── */}
            {previewFailed ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <AlertTriangle className="w-6 h-6 text-gray-300" />
                <p className="text-xs text-gray-500">تعذّر تحميل تفاصيل حسابك.</p>
                <button onClick={loadPreview} className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline">
                  إعادة المحاولة
                </button>
              </div>
            ) : !preview ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Wallet balance gets the loudest treatment on the page: it is the one
                    thing here with a number the user can compare to their own money. */}
                {balances.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                      <Wallet className="w-3.5 h-3.5 shrink-0" />
                      رصيدك الحالي
                    </p>
                    <div className="mt-2 space-y-1">
                      {balances.map((b) => (
                        <p key={b.currency} className="text-lg font-extrabold text-amber-900 tabular-nums">
                          {formatMoney(b.balance, b.currency)}
                        </p>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-amber-800 leading-relaxed">
                      سيصبح رصيدك غير قابل للوصول — يُنصح بإنفاقه أو سحبه أولاً.
                    </p>
                  </div>
                )}

                {/* Counts, only when there is something to count — a row of zeroes
                    reads as reassurance and this screen must not reassure. */}
                {(listings > 0 || topups > 0) && (
                  <div className="grid grid-cols-2 gap-2">
                    {listings > 0 && <StatTile value={listings} label="إعلان نشط سيُخفى" />}
                    {topups > 0 && <StatTile value={topups} label="عملية شحن قيد المعالجة" />}
                  </div>
                )}

                {preview.stores && preview.stores.length > 0 && (
                  <div className="rounded-xl border border-gray-200 p-3">
                    <p className="text-xs font-bold text-gray-500 mb-1.5">متاجرك</p>
                    <ul className="space-y-1">
                      {preview.stores.map((s, i) => (
                        <li key={`${s.name}-${i}`} className="text-sm text-gray-700">
                          {s.name}
                          {s.membership?.paidUntil && (
                            <span className="text-xs text-gray-400">
                              {' '}— اشتراك حتى {formatShortDate(s.membership.paidUntil)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {warnings.length > 0 && (
                  <ul className="space-y-2">
                    {warnings.map((code) => {
                      const copy = ACCOUNT_DELETION_WARNING_COPY[code];
                      return (
                        <li
                          key={code}
                          className={cn(
                            'rounded-xl border p-3',
                            copy.money ? 'border-amber-200 bg-amber-50/60' : 'border-gray-200',
                          )}
                        >
                          <p className={cn(
                            'flex items-center gap-1.5 text-xs font-bold',
                            copy.money ? 'text-amber-800' : 'text-gray-700',
                          )}>
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            {copy.title}
                          </p>
                          <p className="mt-1 text-xs text-gray-600 leading-relaxed">{copy.body}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {warnings.length === 0 && balances.length === 0 && listings === 0 && (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    لا يوجد في حسابك رصيد أو إعلانات نشطة.
                  </p>
                )}
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={!preview && !previewFailed}
                className="flex-1 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                متابعة
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ── Consent + re-auth ── */}
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-bold text-red-800 mb-2">ماذا يحدث عند الحذف</p>
              <ul className="space-y-1">
                {DELETION_CONSEQUENCES.map((line) => (
                  <li key={line} className="flex items-start gap-1.5 text-xs text-red-900 leading-relaxed">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-red-400 shrink-0" />
                    {line}
                  </li>
                ))}
              </ul>
              {/* The half users most often get wrong, so it is set apart rather than
                  buried as a fifth bullet. */}
              <p className="mt-3 pt-3 border-t border-red-200 text-xs text-red-900 leading-relaxed">
                {DELETION_REREGISTER_NOTE}
              </p>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                سبب الحذف <span className="text-gray-400 font-normal">(اختياري)</span>
              </label>
              <div className="space-y-1.5">
                {DELETION_REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(reason === r.value ? '' : r.value)}
                    className={cn(
                      'w-full text-start px-3 py-2.5 rounded-xl border text-sm transition-colors',
                      reason === r.value
                        ? 'border-red-300 bg-red-50 text-red-800 font-semibold'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="delete-password" className="block text-xs font-semibold text-gray-500 mb-1.5">
                كلمة المرور <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="delete-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPwError(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                  className={`${inputCls(pwError ?? undefined)} pe-10`}
                  dir="ltr"
                  autoComplete="current-password"
                  disabled={deleting}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  tabIndex={-1}
                  aria-label={showPw ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">نطلبها للتأكد من أنك صاحب الحساب.</p>
              {pwError && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />{pwError}
                </p>
              )}
            </div>

            {formError && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 leading-relaxed">
                {formError}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setStep('review')}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                رجوع
              </button>
              {/* The only filled red in the flow. */}
              <button
                onClick={submit}
                disabled={!password || deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                حذف حسابي نهائياً
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3 text-center">
      <p className="text-xl font-extrabold text-gray-900 tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] text-gray-500 leading-snug">{label}</p>
    </div>
  );
}

function formatShortDate(d: string): string {
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString('ar-SY', { day: 'numeric', month: 'long', year: 'numeric' });
}
