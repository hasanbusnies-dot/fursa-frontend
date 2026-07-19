'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Loader2, Wallet as WalletIcon, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  ownerStoreService,
  type StoreDetail,
  type MembershipCurrency,
} from '@/services/stores.service';
import { walletService, type Wallet } from '@/services/wallet.service';
import { ApiError } from '@/services/api';
import { formatMoney, compareAmounts } from '@/lib/money';
import { cn } from '@/lib/utils';

// Owner self-serve membership payment (AP-M2.4): always FULL_PRICE, always ONLINE,
// debited from the owner's selected wallet balance (SYP or USD) at that currency's
// plan price (store.plan — computed nets, displayed ≡ charged). The agent CASH flow
// (campaign picker, receipt capture) lives in MembershipChargeModal — this is
// deliberately the stripped version.

const INSUFFICIENT_MSG = 'رصيد المحفظة غير كافٍ — يرجى شحن المحفظة أولاً.';

const CURRENCY_NAME: Record<MembershipCurrency, string> = {
  SYP: 'ليرة سورية',
  USD: 'دولار أمريكي',
};

// Only SYP can be unpriced (the backend requires a USD price), hence the SYP-specific text.
const UNPRICED_NOTE: Record<MembershipCurrency, string> = {
  SYP: 'غير متاح — لم يُحدَّد سعر العضوية بالليرة بعد',
  USD: 'غير متاح',
};

export function OwnerMembershipPayModal({
  store,
  onClose,
  onCharged,
  onRenewBlocked,
}: {
  store: StoreDetail;
  onClose: () => void;
  onCharged: (detail: StoreDetail) => void;
  /** 409 safety net — the view was stale and the renew window isn't open yet.
   *  Caller should refresh the store detail so the pay button reflects renewAllowed. */
  onRenewBlocked?: () => void;
}) {
  const plan = store.plan ?? null;

  // One idempotency key per modal open — a double-tap can't double-charge.
  const [idemKey] = useState(() => crypto.randomUUID());
  const [currency, setCurrency] = useState<MembershipCurrency>(() => (plan?.prices.USD ? 'USD' : 'SYP'));
  const [paying, setPaying] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Wallet balances — null while loading. walletFailed distinguishes "fetch failed"
  // (balances unknown → «—», don't block, backend 422 decides) from "loaded but a
  // currency has no row" (rows are created lazily on first credit, so an absent row
  // IS a zero balance and must render as 0.00, never as «—»).
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletFailed, setWalletFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    walletService.getWallet()
      .then((w) => { if (!cancelled) setWallet(w); })
      .catch(() => { if (!cancelled) { setWalletFailed(true); setWallet({ status: 'ACTIVE', balances: [] }); } });
    return () => { cancelled = true; };
  }, []);

  const balanceFor = (c: MembershipCurrency): string | undefined => {
    if (wallet === null || walletFailed) return undefined;
    return wallet.balances.find((b) => b.currency === c)?.balance ?? '0';
  };

  // money-STRING; undefined when no plan or the selected currency is unpriced.
  const price = plan?.prices[currency]?.FULL_PRICE;
  const balance = balanceFor(currency);
  const insufficient =
    price !== undefined && balance !== undefined && compareAmounts(balance, price) < 0;

  const pay = async () => {
    if (paying || price === undefined) return;
    setError(null);
    setPaying(true);
    try {
      const detail = await ownerStoreService.chargeMembership({ currency, idempotencyKey: idemKey });
      toast.success('تم تفعيل اشتراك العضوية بنجاح.');
      onCharged(detail);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError(INSUFFICIENT_MSG);
      } else if (err instanceof ApiError && err.status === 409) {
        // Stale view: the renew window isn't open yet (month-by-month rule).
        toast.error('لا يمكن التجديد بعد — لم تفتح نافذة التجديد للاشتراك الحالي.');
        onRenewBlocked?.();
        onClose();
      } else if (err instanceof ApiError && err.status === 403) {
        setError('محفظتك مجمّدة حالياً. تواصل مع الدعم.');
      } else {
        setError(err instanceof Error ? err.message : 'تعذّر إتمام الدفع. حاول مرة أخرى.');
      }
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">تفعيل اشتراك العضوية</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {plan === null ? (
          /* No active plan configured — charging unavailable. */
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="flex items-start gap-2 text-sm text-amber-800 leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              الاشتراك غير متاح حالياً — لا توجد خطة عضوية فعّالة. حاول لاحقاً أو تواصل مع الدعم.
            </p>
          </div>
        ) : (
        <div className="space-y-4">
          {/* Price */}
          <div className="rounded-xl bg-orange-50 border border-orange-100 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">اشتراك شهري — السعر الكامل</p>
            <p className="text-2xl font-extrabold text-gray-900">
              {price !== undefined ? formatMoney(price, currency) : '—'}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              يُخصم من رصيد محفظتك {currency === 'USD' ? 'بالدولار' : 'بالليرة السورية'}.
            </p>
          </div>

          {/* Charge currency — which balance pays, at that currency's plan price */}
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-2">
              <WalletIcon className="w-3.5 h-3.5" />
              ادفع من رصيد
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['SYP', 'USD'] as const).map((c) => {
                const priced = plan.prices[c] !== null;
                const bal = balanceFor(c); // '0' when loaded-but-unfunded; undefined only on failed fetch
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    disabled={!priced}
                    className={cn(
                      'py-3 px-3 rounded-xl border-2 text-center transition-all',
                      currency === c
                        ? 'border-orange-400 bg-orange-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300',
                      !priced && 'opacity-50 cursor-not-allowed hover:border-gray-200',
                    )}
                  >
                    <p className="text-sm font-bold text-gray-900">{CURRENCY_NAME[c]}</p>
                    {priced ? (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {wallet === null ? (
                          <Loader2 className="w-3.5 h-3.5 text-gray-300 animate-spin inline-block" />
                        ) : bal !== undefined ? (
                          <>الرصيد: <span className="font-semibold text-gray-700">{formatMoney(bal, c)}</span></>
                        ) : (
                          'الرصيد: —'
                        )}
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{UNPRICED_NOTE[c]}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Insufficient balance — point to the consumer online top-up */}
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
                <WalletIcon className="w-4 h-4" />
                شحن المحفظة
              </Link>
            </div>
          )}

          {error && error !== INSUFFICIENT_MSG && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700 leading-snug">{error}</p>
            </div>
          )}

          <button
            onClick={pay}
            disabled={paying || insufficient || price === undefined}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
            {paying
              ? 'جارٍ الدفع…'
              : price !== undefined
              ? `ادفع ${formatMoney(price, currency)} وفعّل الاشتراك`
              : 'ادفع وفعّل الاشتراك'}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
