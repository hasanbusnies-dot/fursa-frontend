'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Loader2, Check, BadgeCheck, Wallet, HandCoins, Gift, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  agentStoresService,
  ownerUserIdOf,
  MEMBERSHIP_CAMPAIGNS,
  type StoreDetail,
  type MembershipCampaign,
  type MembershipMethod,
} from '@/services/stores.service';
import { agentService } from '@/services/agent.service';
import { ApiError } from '@/services/api';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { CameraCapture } from '@/components/CameraCapture';

// Campaign / method pickers + the CASH two-step (fund owner USD wallet → charge).

const CAMPAIGNS: MembershipCampaign[] = ['FULL_PRICE', 'DISCOUNT_33', 'FIRST_MONTH_FREE'];

const METHOD_META: Record<MembershipMethod, { label: string; hint: string; Icon: React.ElementType }> = {
  ONLINE: { label: 'إلكتروني', hint: 'يُخصم من محفظة المالك (يجب توفّر الرصيد)', Icon: Wallet   },
  CASH:   { label: 'نقداً',    hint: 'حصّل المبلغ نقداً ثم فعّل الاشتراك',        Icon: HandCoins },
  FREE:   { label: 'مجاني',    hint: 'متاح فقط مع عرض الشهر الأول مجاناً',       Icon: Gift     },
};

type Phase = 'idle' | 'funding' | 'charging';

export function MembershipChargeModal({
  store, onClose, onCharged,
}: {
  store: StoreDetail;
  onClose: () => void;
  onCharged: () => void;
}) {
  const [campaign, setCampaign] = useState<MembershipCampaign>('FULL_PRICE');
  const [method, setMethod]     = useState<MembershipMethod>('ONLINE');
  const [phase, setPhase]       = useState<Phase>('idle');
  const [receipt, setReceipt]   = useState<File | null>(null); // required for the CASH funding step

  const isFree = campaign === 'FIRST_MONTH_FREE';
  const busy = phase !== 'idle';

  // FIRST_MONTH_FREE ⇒ method must be FREE; any other campaign ⇒ FREE is invalid.
  useEffect(() => {
    if (isFree) setMethod('FREE');
    else if (method === 'FREE') setMethod('ONLINE');
  }, [isFree]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const price = MEMBERSHIP_CAMPAIGNS[campaign].price;
  const priceLabel = useMemo(
    () => (isFree ? 'مجاني' : formatMoney(price, 'USD')),
    [isFree, price],
  );

  const submit = async () => {
    if (busy) return;
    // CASH funds the owner's wallet via a topup, which now requires a receipt photo.
    if (method === 'CASH' && !receipt) {
      toast.error('يجب التقاط صورة إيصال الاستلام.');
      return;
    }
    try {
      if (method === 'CASH') {
        // ── Step 1: capture receipt → fund the owner's USD wallet (TOPUP_CASH) ──
        let ownerId = ownerUserIdOf(store);
        if (!ownerId) {
          const phone = store.ownerPhone ?? store.owner?.phone ?? null;
          if (!phone) { toast.error('تعذّر تحديد المالك لتمويل المحفظة.'); return; }
          const card = await agentService.lookupUser(phone);
          ownerId = card.userId;
        }
        setPhase('funding');
        const topup = await agentService.createTopup({
          sellerUserId:   ownerId,
          amount:         price,
          currency:       'USD',
          note:           'تمويل اشتراك العضوية',
          idempotencyKey: crypto.randomUUID(),
          receipt:        receipt!,
        });

        // ── Step 2: charge the membership against that collection ──
        setPhase('charging');
        await agentStoresService.chargeMembership(store.id, {
          campaign,
          method: 'CASH',
          idempotencyKey: crypto.randomUUID(),
          agentCashCollectionId: topup.collection.id,
        });
      } else {
        setPhase('charging');
        await agentStoresService.chargeMembership(store.id, {
          campaign,
          method,
          idempotencyKey: crypto.randomUUID(),
        });
      }

      toast.success('تم تفعيل الاشتراك بنجاح.');
      onCharged();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422) {
          toast.error(isFree
            ? 'تم استخدام عرض الشهر المجاني مسبقاً.'
            : 'رصيد المحفظة غير كافٍ. حصّل المبلغ نقداً أو اشحن المحفظة.');
        } else if (err.status === 403) {
          toast.error('الحساب مجمّد، لا يمكن إتمام العملية.');
        } else if (err.status === 409) {
          toast.error('المتجر غير مُعتمد بعد.');
        } else {
          toast.error(err.message || 'تعذّر تفعيل الاشتراك. حاول مرة أخرى.');
        }
      } else {
        toast.error(err instanceof Error ? err.message : 'تعذّر تفعيل الاشتراك. حاول مرة أخرى.');
      }
    } finally {
      setPhase('idle');
    }
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
              <BadgeCheck className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">تحصيل الاشتراك</h3>
              <p className="text-xs text-slate-500 truncate max-w-[200px]">{store.name}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={busy} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors disabled:opacity-50">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Campaign */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">العرض</label>
            <div className="space-y-2">
              {CAMPAIGNS.map((c) => {
                const m = MEMBERSHIP_CAMPAIGNS[c];
                const active = campaign === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCampaign(c)}
                    disabled={busy}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-start transition-colors disabled:opacity-50',
                      active ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300',
                    )}
                  >
                    <span className="text-sm font-bold text-slate-800">{m.label}</span>
                    <span className={cn('text-sm font-extrabold', active ? 'text-teal-700' : 'text-slate-500')}>
                      {c === 'FIRST_MONTH_FREE' ? 'مجاني' : formatMoney(m.price, 'USD')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">طريقة الدفع</label>
            <div className="grid grid-cols-3 gap-2">
              {(['ONLINE', 'CASH', 'FREE'] as MembershipMethod[]).map((mth) => {
                const meta = METHOD_META[mth];
                const disabled = busy || (mth === 'FREE' ? !isFree : isFree);
                const active = method === mth;
                return (
                  <button
                    key={mth}
                    type="button"
                    onClick={() => setMethod(mth)}
                    disabled={disabled}
                    className={cn(
                      'flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-bold transition-colors',
                      active ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600 hover:border-slate-300',
                      disabled && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    <meta.Icon className="w-4 h-4" />
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">{METHOD_META[method].hint}</p>
          </div>

          {/* CASH two-step explainer + required receipt capture */}
          {method === 'CASH' && (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
                <Step n={1} label={`حصّل ${formatMoney(price, 'USD')} نقداً وصوّر الإيصال (شحن محفظة المالك)`} done={phase === 'charging'} active={phase === 'funding'} />
                <Step n={2} label="فعّل الاشتراك" done={false} active={phase === 'charging'} />
              </div>
              <CameraCapture
                file={receipt}
                onPick={setReceipt}
                title="صورة إيصال الاستلام"
                hint="صوّر إيصال استلام النقد من المالك. هذه الصورة إلزامية."
                captureLabel="صوّر إيصال الاستلام"
                previewAlt="معاينة صورة الإيصال"
              />
            </div>
          )}

          {/* Amount summary */}
          <div className="flex items-center justify-between rounded-xl bg-slate-900 text-white px-4 py-3">
            <span className="text-xs text-slate-300">المبلغ</span>
            <span className="text-lg font-extrabold">{priceLabel}</span>
          </div>

          <p className="flex items-start gap-1.5 text-[11px] text-slate-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {method === 'ONLINE'
              ? 'سيُخصم المبلغ من محفظة المالك بالدولار. تأكّد من توفّر الرصيد.'
              : method === 'CASH'
              ? 'سيتم شحن محفظة المالك بالمبلغ المُحصّل ثم خصمه للاشتراك.'
              : 'لن يتم خصم أي مبلغ — عرض الشهر الأول مجاناً.'}
          </p>

          <button
            onClick={submit}
            disabled={busy || (method === 'CASH' && !receipt)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-500 transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
            {phase === 'funding' ? 'جارٍ التحصيل…' : phase === 'charging' ? 'جارٍ التفعيل…' : 'تأكيد وتفعيل الاشتراك'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ n, label, done, active }: { n: number; label: string; done: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn(
        'w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
        done ? 'bg-teal-600 text-white' : active ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500',
      )}>
        {done ? <Check className="w-3 h-3" /> : n}
      </span>
      <span className="text-xs text-slate-700">{label}</span>
    </div>
  );
}
