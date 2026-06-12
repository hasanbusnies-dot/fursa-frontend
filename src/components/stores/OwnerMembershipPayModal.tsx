'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Loader2, Wallet, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  ownerStoreService,
  MEMBERSHIP_CAMPAIGNS,
  type StoreDetail,
} from '@/services/stores.service';
import { walletService } from '@/services/wallet.service';
import { ApiError } from '@/services/api';
import { formatMoney, compareAmounts } from '@/lib/money';

// Owner self-serve membership payment (AP-M2.4): always FULL_PRICE, always ONLINE,
// debited from the owner's USD wallet. The agent CASH flow (campaign picker, receipt
// capture) lives in MembershipChargeModal — this is deliberately the stripped version.

const INSUFFICIENT_MSG = 'رصيد المحفظة غير كافٍ — يرجى شحن المحفظة أولاً.';

export function OwnerMembershipPayModal({
  onClose,
  onCharged,
  onRenewBlocked,
}: {
  onClose: () => void;
  onCharged: (detail: StoreDetail) => void;
  /** 409 safety net — the view was stale and the renew window isn't open yet.
   *  Caller should refresh the store detail so the pay button reflects renewAllowed. */
  onRenewBlocked?: () => void;
}) {
  const price = MEMBERSHIP_CAMPAIGNS.FULL_PRICE.price; // '75' USD, money-STRING

  // One idempotency key per modal open — a double-tap can't double-charge.
  const [idemKey] = useState(() => crypto.randomUUID());
  const [paying, setPaying] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // USD balance (money-STRING) — null while loading, '' if the fetch failed
  // (unknown balance ⇒ don't block payment, let the backend 422 decide).
  const [usdBalance, setUsdBalance] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    walletService.getWallet()
      .then((w) => {
        if (cancelled) return;
        setUsdBalance(w.balances.find((b) => b.currency === 'USD')?.balance ?? '0');
      })
      .catch(() => { if (!cancelled) setUsdBalance(''); });
    return () => { cancelled = true; };
  }, []);

  const insufficient = usdBalance !== null && usdBalance !== '' && compareAmounts(usdBalance, price) < 0;

  const pay = async () => {
    if (paying) return;
    setError(null);
    setPaying(true);
    try {
      const detail = await ownerStoreService.chargeMembership({ idempotencyKey: idemKey });
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

        <div className="space-y-4">
          {/* Price */}
          <div className="rounded-xl bg-orange-50 border border-orange-100 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">اشتراك شهري — السعر الكامل</p>
            <p className="text-2xl font-extrabold text-gray-900">{formatMoney(price, 'USD')}</p>
            <p className="text-[11px] text-gray-400 mt-1">يُخصم من رصيد محفظتك بالدولار.</p>
          </div>

          {/* Wallet balance */}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <Wallet className="w-4 h-4 text-gray-400" />
              رصيد محفظتك (دولار)
            </span>
            {usdBalance === null ? (
              <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
            ) : usdBalance === '' ? (
              <span className="text-xs text-gray-400">—</span>
            ) : (
              <span className="text-sm font-bold text-gray-900">{formatMoney(usdBalance, 'USD')}</span>
            )}
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

          <button
            onClick={pay}
            disabled={paying || insufficient}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
            {paying ? 'جارٍ الدفع…' : `ادفع ${formatMoney(price, 'USD')} وفعّل الاشتراك`}
          </button>
        </div>
      </div>
    </div>
  );
}
