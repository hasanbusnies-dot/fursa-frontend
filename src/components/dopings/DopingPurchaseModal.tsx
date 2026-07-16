'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  X, Zap, Star, LayoutGrid, ArrowUp, Search,
  Flame, Type, RefreshCw, CheckCircle, Clock,
  Wallet, Loader2, AlertTriangle, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  dopingsService,
  type DopingType,
  type DopingCurrency,
  type DopingPackageInfo,
} from '@/services/dopings.service';
import { walletService, type Wallet as WalletInfo } from '@/services/wallet.service';
import { ApiError } from '@/services/api';
import { formatMoney, compareAmounts, multiplyAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

// ── Types & config ────────────────────────────────────────────────────────────
// Prices are NOT defined here — they come from GET /dopings/packages (the live DB
// prices the backend actually charges). Displayed total ≡ charged total, always.

type DurationWeeks = 1 | 2 | 4;

interface DopingOption {
  type: DopingType | 'REFRESH_DATE';
  /** DB DopingPackage.type this option is priced by. */
  packageType: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  /** true → duration selector (charged pricePerWeek × weeks); false → fixed. */
  timed: boolean;
  fixedDurationLabel?: string;
}

const DOPING_OPTIONS: DopingOption[] = [
  {
    type: 'HOMEPAGE',
    packageType: 'HOMEPAGE',
    icon: Star,
    iconBg: 'bg-yellow-50',
    iconColor: 'text-yellow-500',
    title: 'واجهة الصفحة الرئيسية',
    description: 'اظهر للملايين على الصفحة الرئيسية.',
    timed: true,
  },
  {
    type: 'CATEGORY',
    packageType: 'CATEGORY',
    icon: LayoutGrid,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    title: 'واجهة الفئة',
    description: 'أعلى واجهة في صفحة الفئة.',
    timed: true,
  },
  {
    type: 'TOP_OF_SEARCH',
    packageType: 'TOP_OF_SEARCH',
    icon: ArrowUp,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-500',
    title: 'في أعلى القائمة',
    description: 'تصدر نتائج البحث دائماً.',
    timed: true,
  },
  {
    type: 'DETAILED_SEARCH',
    packageType: 'DETAILED_SEARCH',
    icon: Search,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-500',
    title: 'واجهة البحث المتقدم',
    description: 'ابرز في نتائج البحث المتقدم.',
    timed: true,
  },
  {
    // Backend applies URGENT/HIGHLIGHT for exactly 1 week (urgentUntil/highlightUntil)
    // — say so honestly instead of the old "one-time" label.
    type: 'URGENT',
    packageType: 'URGENT',
    icon: Flame,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
    title: 'إعلان عاجل',
    description: "الفت الانتباه بشارة 'عاجل' الحمراء.",
    timed: false,
    fixedDurationLabel: 'لمدة أسبوع',
  },
  {
    type: 'HIGHLIGHT',
    packageType: 'HIGHLIGHT',
    icon: Type,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-500',
    title: 'خط عريض وإطار',
    description: 'ابرز في القائمة بإطار ملون.',
    timed: false,
    fixedDurationLabel: 'لمدة أسبوع',
  },
  {
    type: 'REFRESH_DATE',
    packageType: 'REFRESH',
    icon: RefreshCw,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-500',
    title: 'تحديث تاريخ الإعلان',
    description: 'انقل إعلانك للأعلى بتحديث تاريخ النشر.',
    timed: false,
    fixedDurationLabel: 'لمرة واحدة',
  },
];

const DURATION_OPTIONS: { weeks: DurationWeeks; label: string }[] = [
  { weeks: 1, label: 'أسبوع واحد' },
  { weeks: 2, label: 'أسبوعان' },
  { weeks: 4, label: '4 أسابيع' },
];

const CURRENCY_META: Record<DopingCurrency, { name: string }> = {
  SYP: { name: 'ليرة سورية' },
  USD: { name: 'دولار أمريكي' },
};

// sahibinden's biggest Güncelim complaint class: users assuming the refresh extends
// the publication period. Kill it with one explicit line.
const REFRESH_SCOPE_NOTE =
  'هذه الترقية تُحدّث تاريخ نشر الإعلان فقط ليتقدّم في الترتيب — وهي لا تُمدّد فترة عرض الإعلان ولا تُغيّر تاريخ انتهائه.';

const INSUFFICIENT_MSG = 'رصيد المحفظة غير كافٍ — يرجى شحن المحفظة أولاً.';

// ── Modal ─────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
}

export function DopingPurchaseModal({ isOpen, onClose, listingId, listingTitle }: Props) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<DopingOption>(DOPING_OPTIONS[0]);
  const [duration, setDuration]         = useState<DurationWeeks>(1);
  const [currency, setCurrency]         = useState<DopingCurrency>('SYP');
  const [purchasing, setPurchasing]     = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // One idempotency key per modal open — a double-tap can't double-charge.
  const [idemKey, setIdemKey] = useState('');

  // null = loading; [] / undefined balances = fetch failed (don't block — backend decides).
  const [packages, setPackages] = useState<DopingPackageInfo[] | null>(null);
  const [wallet, setWallet]     = useState<WalletInfo | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIdemKey(crypto.randomUUID());
    setError(null);
    setPackages(null);
    setWallet(null);
    dopingsService.getPackages()
      .then((p) => { if (!cancelled) setPackages(p); })
      .catch(() => { if (!cancelled) setPackages([]); });
    walletService.getWallet()
      .then((w) => { if (!cancelled) setWallet(w); })
      .catch(() => { if (!cancelled) setWallet({ status: 'ACTIVE', balances: [] }); });
    return () => { cancelled = true; };
  }, [isOpen]);

  if (!isOpen) return null;

  const loading = packages === null || wallet === null;

  /** Real per-week/per-use price (money-STRING) for an option in the chosen currency. */
  const priceFor = (opt: DopingOption, cur: DopingCurrency): string | undefined =>
    packages?.find((p) => p.type === opt.packageType)
      ?.prices.find((pr) => pr.currency === cur)?.pricePerWeek;

  const unitPrice = priceFor(selectedType, currency);
  const total = unitPrice !== undefined
    ? (selectedType.timed ? multiplyAmount(unitPrice, duration) : unitPrice)
    : undefined;

  const balance = wallet?.balances.find((b) => b.currency === currency)?.balance;
  const insufficient =
    total !== undefined && balance !== undefined && compareAmounts(balance, total) < 0;

  const payDisabled = purchasing || loading || total === undefined || insufficient;

  const handlePurchase = async () => {
    if (payDisabled) return;
    setError(null);
    setPurchasing(true);
    try {
      if (selectedType.type === 'REFRESH_DATE') {
        await dopingsService.refreshDate({ listingId, currency, idempotencyKey: idemKey });
      } else {
        await dopingsService.apply({
          listingId,
          dopingType: selectedType.type as DopingType,
          durationInWeeks: selectedType.timed ? duration : 1,
          currency,
          idempotencyKey: idemKey,
        });
      }
      toast.success(`تم تطبيق "${selectedType.title}" بنجاح!`);
      onClose();
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError(INSUFFICIENT_MSG);
      } else if (err instanceof ApiError && err.status === 403) {
        setError('محفظتك مجمّدة حالياً. تواصل مع الدعم.');
      } else if (err instanceof ApiError && err.status === 409) {
        setError('لا يمكن تحديث الإعلان الآن — يُسمح بالتحديث مرة واحدة كل 24 ساعة (وبعد مرور 24 ساعة على نشر الإعلان).');
      } else {
        setError(err instanceof Error ? err.message : 'فشلت العملية. حاول مرة أخرى.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-yellow-400 flex items-center justify-center">
              <Zap className="w-4 h-4 text-yellow-900" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-none">شراء ترقية</h2>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-[280px]">{listingTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Boost type selector */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">اختر نوع الترقية</p>
            <div className="grid grid-cols-1 gap-2">
              {DOPING_OPTIONS.map((opt) => {
                const selected = selectedType.type === opt.type;
                const optPrice = priceFor(opt, currency);
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setSelectedType(opt)}
                    className={cn(
                      'flex items-center gap-3 p-3.5 rounded-xl border-2 text-start transition-all',
                      selected
                        ? 'border-orange-400 bg-orange-50/60 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 bg-white',
                    )}
                  >
                    {/* Selection indicator — always occupies space, hidden when not selected */}
                    <CheckCircle
                      className={cn('w-4 h-4 shrink-0 transition-opacity', selected ? 'text-orange-500 opacity-100' : 'opacity-0')}
                    />

                    {/* Type icon */}
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', opt.iconBg)}>
                      <opt.icon className={cn(opt.iconColor)} style={{ width: 18, height: 18 }} />
                    </div>

                    {/* Title + description */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                        {opt.title}
                        {opt.fixedDurationLabel && (
                          <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                            {opt.fixedDurationLabel}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                    </div>

                    {/* Real price from the API — aligned to the left edge (end in RTL) */}
                    <div className="shrink-0 text-end">
                      {loading ? (
                        <Loader2 className="w-4 h-4 text-gray-300 animate-spin ms-auto" />
                      ) : optPrice !== undefined ? (
                        <>
                          <p className="text-sm font-extrabold text-yellow-900">{formatMoney(optPrice, currency)}</p>
                          <p className="text-[10px] text-gray-400">{opt.timed ? '/ أسبوع' : opt.fixedDurationLabel}</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">غير متاح</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* REFRESH_DATE scope note — date only, does NOT extend the publication period */}
          {selectedType.type === 'REFRESH_DATE' && (
            <div className="rounded-xl bg-sky-50 border border-sky-200 p-3.5">
              <p className="flex items-start gap-2 text-xs text-sky-800 leading-relaxed">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                {REFRESH_SCOPE_NOTE}
              </p>
            </div>
          )}

          {/* Duration selector */}
          {selectedType.timed && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                اختر المدة
              </p>
              <div className="grid grid-cols-3 gap-2">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d.weeks}
                    type="button"
                    onClick={() => setDuration(d.weeks)}
                    className={cn(
                      'py-3 rounded-xl border-2 text-center transition-all',
                      duration === d.weeks
                        ? 'border-orange-400 bg-orange-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300',
                    )}
                  >
                    <p className="text-sm font-bold text-gray-900">{d.label}</p>
                    <p className="text-xs text-yellow-900 font-semibold mt-0.5">
                      {unitPrice !== undefined ? formatMoney(multiplyAmount(unitPrice, d.weeks), currency) : '—'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Wallet currency selector — which balance funds the purchase */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              ادفع من رصيد
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['SYP', 'USD'] as const).map((c) => {
                const bal = wallet?.balances.find((b) => b.currency === c)?.balance;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={cn(
                      'py-3 px-3 rounded-xl border-2 text-center transition-all',
                      currency === c
                        ? 'border-orange-400 bg-orange-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300',
                    )}
                  >
                    <p className="text-sm font-bold text-gray-900">{CURRENCY_META[c].name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {wallet === null ? (
                        <Loader2 className="w-3.5 h-3.5 text-gray-300 animate-spin inline-block" />
                      ) : bal !== undefined ? (
                        <>الرصيد: <span className="font-semibold text-gray-700">{formatMoney(bal, c)}</span></>
                      ) : (
                        'الرصيد: —'
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">ملخص الطلب</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{selectedType.title}</span>
                <span className="font-semibold text-gray-900">
                  {selectedType.timed
                    ? DURATION_OPTIONS.find((d) => d.weeks === duration)?.label
                    : selectedType.fixedDurationLabel}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between items-baseline">
                <span className="text-sm font-bold text-gray-800">المجموع — يُخصم من محفظتك</span>
                <span className="text-xl font-extrabold text-yellow-900">
                  {total !== undefined ? formatMoney(total, currency) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Insufficient balance — point to the wallet top-up */}
          {(insufficient || error === INSUFFICIENT_MSG) && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5">
              <p className="flex items-start gap-2 text-xs text-amber-800 leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                {INSUFFICIENT_MSG}
              </p>
              <Link
                href="/account/wallet"
                className="mt-2.5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-l from-orange-500 to-pink-500 text-white text-sm font-bold hover:opacity-95 transition-opacity"
              >
                <Wallet className="w-4 h-4" />
                شحن المحفظة
              </Link>
            </div>
          )}

          {error && error !== INSUFFICIENT_MSG && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700 leading-snug">{error}</p>
            </div>
          )}

          {/* Purchase button */}
          <button
            type="button"
            onClick={handlePurchase}
            disabled={payDisabled}
            className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-extrabold text-sm py-3.5 rounded-xl shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {purchasing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                جارٍ التنفيذ…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                {total !== undefined ? `اشترِ وأكّد — ${formatMoney(total, currency)}` : 'اشترِ وأكّد'}
              </>
            )}
          </button>

          <p className="text-[11px] text-center text-gray-400 leading-relaxed">
            بشرائك لهذه الترقية، فإنك توافق على{' '}
            <a href="/vitrin" className="underline hover:text-gray-600">شروط استخدام الترقيات</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
