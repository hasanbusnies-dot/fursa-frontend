'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Search, Loader2, UserRound, UserX, Check, ArrowRight, RotateCcw,
  HandCoins, Wallet, AlertTriangle, BadgeCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  agentService,
  type SellerCard,
  type TopupResult,
  type AgentSummary,
  type AgentCurrency,
} from '@/services/agent.service';
import { ApiError } from '@/services/api';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

// Reuse the wallet's amount contract: up to 2 decimals, kept as a STRING.
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;
function isPositiveAmount(a: string): boolean {
  return AMOUNT_RE.test(a) && /[1-9]/.test(a); // at least one non-zero digit
}

const CURRENCIES: AgentCurrency[] = ['SYP', 'USD'];

// ── Outstanding-cash banner ───────────────────────────────────────────────────────
// The physical cash the agent is holding and owes the company (unsettled).

function OutstandingBanner({ summary, loading }: { summary: AgentSummary | null; loading: boolean }) {
  return (
    <div className="rounded-2xl bg-slate-900 text-white p-4 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="w-4 h-4 text-teal-300" />
        <h2 className="text-sm font-bold">النقد المستحق للشركة</h2>
      </div>

      {loading ? (
        <div className="h-7 w-32 bg-white/10 rounded animate-pulse" />
      ) : !summary || summary.outstanding.length === 0 ? (
        <p className="text-sm text-slate-400">لا يوجد نقد مستحق — جميع التحصيلات مُسوّاة.</p>
      ) : (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {summary.outstanding.map((o) => (
            <div key={o.currency}>
              <p className="text-lg font-extrabold leading-none">{formatMoney(o.amount, o.currency)}</p>
              <p className="text-[11px] text-slate-400 mt-1">بحوزتك حالياً</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

type Step = 'lookup' | 'confirm';

export default function AgentCollectPage() {
  // Outstanding summary
  const [summary, setSummary]     = useState<AgentSummary | null>(null);
  const [loadingSummary, setLS]   = useState(true);

  // Lookup
  const [phone, setPhone]         = useState('');
  const [looking, setLooking]     = useState(false);
  const [notFound, setNotFound]   = useState(false);
  const [seller, setSeller]       = useState<SellerCard | null>(null);

  // Collection form
  const [amount, setAmount]       = useState('');
  const [currency, setCurrency]   = useState<AgentCurrency>('SYP');
  const [note, setNote]           = useState('');
  const [idemKey, setIdemKey]     = useState('');
  const [submitting, setSubmit]   = useState(false);

  // Success
  const [result, setResult]       = useState<TopupResult | null>(null);

  const step: Step = seller ? 'confirm' : 'lookup';

  const loadSummary = useCallback(() => {
    setLS(true);
    agentService.getSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLS(false));
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  // ── Lookup ──
  const doLookup = async () => {
    const p = phone.trim();
    if (!p || looking) return;
    setLooking(true);
    setNotFound(false);
    try {
      const card = await agentService.lookupUser(p);
      setSeller(card);
      // Fresh idempotency key for this collection session (rotates per confirmed seller).
      setIdemKey(crypto.randomUUID());
      setAmount('');
      setNote('');
      setCurrency('SYP');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true); // keep the phone so they can fix a typo
      } else {
        toast.error(err instanceof Error ? err.message : 'تعذّر البحث. حاول مرة أخرى.');
      }
    } finally {
      setLooking(false);
    }
  };

  // Return to lookup (wrong person / change number).
  const changeNumber = () => {
    setSeller(null);
    setNotFound(false);
  };

  // ── Submit collection ──
  const valid = isPositiveAmount(amount);

  const submit = async () => {
    if (!seller || !valid || submitting) return;
    setSubmit(true);
    try {
      const res = await agentService.createTopup({
        sellerUserId:   seller.userId,
        amount,
        currency,
        note:           note.trim() || undefined,
        idempotencyKey: idemKey, // stable per session → a double-tap can't double-credit
      });
      setResult(res);
      loadSummary(); // outstanding cash just went up
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        toast.error('صلاحيات غير كافية لإجراء التحصيل.');
      } else if (err instanceof ApiError && err.status === 400) {
        toast.error('لا يمكن شحن محفظة موظف.');
      } else {
        toast.error(err instanceof Error ? err.message : 'تعذّر إتمام التحصيل. حاول مرة أخرى.');
      }
    } finally {
      setSubmit(false);
    }
  };

  // Start a fresh collection (reset everything + rotate the key).
  const anotherCollection = () => {
    setResult(null);
    setSeller(null);
    setPhone('');
    setNotFound(false);
    setAmount('');
    setNote('');
    setCurrency('SYP');
    setIdemKey('');
  };

  // ── Success panel ──
  if (result) {
    return (
      <div>
        <OutstandingBanner summary={summary} loading={loadingSummary} />
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
            <BadgeCheck className="w-7 h-7 text-teal-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">تم التحصيل بنجاح</h2>
          <p className="text-sm text-slate-500 mt-1">
            تم شحن محفظة <span className="font-semibold text-slate-700">{result.collection.sellerName}</span>
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 text-start">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-[11px] text-slate-500 mb-1">المبلغ المُحصّل</p>
              <p className="text-base font-extrabold text-slate-900">
                {formatMoney(result.collection.amount, result.collection.currency)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-[11px] text-slate-500 mb-1">الرصيد بعد الشحن</p>
              <p className="text-base font-extrabold text-teal-700">
                {formatMoney(result.sellerBalanceAfter, result.collection.currency)}
              </p>
            </div>
          </div>

          <button
            onClick={anotherCollection}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            تحصيل جديد
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <OutstandingBanner summary={summary} loading={loadingSummary} />

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-4 text-xs font-semibold">
        <span className={cn('flex items-center gap-1.5', step === 'lookup' ? 'text-teal-600' : 'text-slate-400')}>
          <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[11px]',
            step === 'lookup' ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500')}>1</span>
          البحث
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-300 rotate-180" />
        <span className={cn('flex items-center gap-1.5', step === 'confirm' ? 'text-teal-600' : 'text-slate-400')}>
          <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[11px]',
            step === 'confirm' ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500')}>2</span>
          التأكيد والتحصيل
        </span>
      </div>

      {/* ── Step 1: phone lookup ── */}
      {step === 'lookup' && (
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <label className="block text-sm font-bold text-slate-800 mb-1">رقم هاتف البائع</label>
          <p className="text-xs text-slate-500 mb-3">ابحث عن البائع للتأكّد من هويته قبل شحن محفظته.</p>

          <div className="flex gap-2">
            <input
              inputMode="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setNotFound(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') doLookup(); }}
              placeholder="09xxxxxxxx"
              dir="ltr"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-base font-semibold text-slate-900 text-start focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
            <button
              onClick={doLookup}
              disabled={!phone.trim() || looking}
              className="flex items-center justify-center gap-1.5 px-5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-500 transition-colors disabled:opacity-50"
            >
              {looking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              بحث
            </button>
          </div>

          {notFound && (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
              <UserX className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">لا يوجد بائع بهذا الرقم</p>
                <p className="text-xs text-amber-700 mt-0.5">تأكّد من الرقم وحاول مرة أخرى.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: confirm seller + collect ── */}
      {step === 'confirm' && seller && (
        <div className="space-y-4">

          {/* Confirmation card — visual gate before crediting */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                <UserRound className="w-6 h-6 text-teal-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-extrabold text-slate-900 truncate">{seller.name}</p>
                <p className="text-sm text-slate-500" dir="ltr">{seller.phone}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate" dir="ltr">{seller.userId}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-xl bg-teal-50 border border-teal-200 px-3 py-2">
              <Check className="w-4 h-4 text-teal-600 shrink-0" />
              <p className="text-xs text-teal-800 font-medium">تأكّد أن هذا هو البائع الصحيح قبل المتابعة.</p>
            </div>

            <button
              onClick={changeNumber}
              className="mt-3 text-xs font-semibold text-slate-500 hover:text-slate-700 underline"
            >
              ليس البائع الصحيح؟ تغيير الرقم
            </button>
          </div>

          {/* Collection form */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <HandCoins className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-800">تفاصيل التحصيل</h3>
            </div>

            {/* Currency toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">العملة</label>
              <div className="grid grid-cols-2 gap-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={cn(
                      'py-2.5 rounded-xl text-sm font-bold border transition-colors',
                      currency === c
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300',
                    )}
                  >
                    {c === 'SYP' ? 'ليرة سورية' : 'دولار'}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">المبلغ</label>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="0.00"
                dir="ltr"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-lg font-bold text-slate-900 text-start focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
              {amount !== '' && !valid && (
                <p className="text-xs text-red-500 mt-1.5">أدخل مبلغاً صحيحاً (حتى منزلتين عشريتين).</p>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">ملاحظة (اختياري)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مرجع أو ملاحظة"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 text-start focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <button
              onClick={submit}
              disabled={!valid || submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <HandCoins className="w-4 h-4" />}
              {submitting ? 'جارٍ التحصيل…' : 'تأكيد التحصيل'}
            </button>

            <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              سيُضاف المبلغ مباشرةً إلى محفظة البائع. تأكّد من المبلغ والعملة.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
