'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Wallet, Plus, X, ArrowDownLeft, ArrowUpRight, ArrowLeft, ChevronLeft, ChevronRight,
  Loader2, Lock, RefreshCw, AlertTriangle, QrCode, ExternalLink, Copy, Check, Inbox, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { useStoreGate } from '@/store/store-gate.store';
import { StoreGateBlock } from '@/components/account/StoreGateNotice';
import { ApiError } from '@/services/api';
import {
  walletService,
  type Wallet as WalletData,
  type WalletTransaction,
  type PageMeta,
  type WalletCurrency,
  type WalletTxType,
} from '@/services/wallet.service';
import { formatMoney, formatAmount } from '@/lib/money';
import { cn } from '@/lib/utils';
import { TransferTopupModal } from '@/components/wallet/TransferTopupModal';
import { TransferHistory } from '@/components/wallet/TransferHistory';
import { WALLET_CREDITED_EVENT } from '@/components/providers/SocketManager';

// ── Labels & helpers ────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  TOPUP_CASH:      'شحن نقدي',
  TOPUP_ONLINE:    'شحن إلكتروني',
  SPEND_PROMOTION: 'دفع مقابل ترويج',
  REFUND:          'استرداد',
  ADJUSTMENT:      'تعديل',
  AGENT_REVERSAL:  'إلغاء شحن مندوب',
};

const TYPE_FILTERS: Array<{ value: WalletTxType | 'ALL'; label: string }> = [
  { value: 'ALL',             label: 'كل العمليات' },
  { value: 'TOPUP_ONLINE',    label: 'شحن إلكتروني' },
  { value: 'TOPUP_CASH',      label: 'شحن نقدي' },
  { value: 'SPEND_PROMOTION', label: 'ترويج' },
  { value: 'REFUND',          label: 'استرداد' },
  { value: 'ADJUSTMENT',      label: 'تعديل' },
];

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

function formatDateTime(s: string): string {
  return new Date(s).toLocaleString('ar-SY', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const typeLabel = (t: string) => TYPE_LABELS[t] ?? t; // raw fallback for unknown types

// ── Online top-up modal ─────────────────────────────────────────────────────────

type ClientShape =
  | { kind: 'redirect'; url: string }
  | { kind: 'qr'; qr: string; code?: string; deepLink?: string }
  | { kind: 'code'; code: string }
  | { kind: 'generic'; payload: Record<string, unknown> };

function detectClientData(d: Record<string, unknown>): ClientShape {
  const url = (d.url ?? d.redirectUrl ?? d.paymentUrl) as string | undefined;
  if (d.kind === 'redirect' || url) return { kind: 'redirect', url: String(url) };
  const qr = (d.qr ?? d.qrData ?? d.qrCode) as string | undefined;
  if (d.kind === 'qr' || qr) {
    return { kind: 'qr', qr: String(qr ?? ''), code: d.code as string | undefined, deepLink: d.deepLink as string | undefined };
  }
  if (d.code) return { kind: 'code', code: String(d.code) };
  return { kind: 'generic', payload: d };
}

function ClientDataView({ data }: { data: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false);
  const shape = detectClientData(data);

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => toast.error('تعذّر النسخ.'));
  };

  if (shape.kind === 'redirect') {
    return (
      <a
        href={shape.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-l from-orange-500 to-pink-500 text-white text-sm font-bold hover:opacity-95 transition-opacity"
      >
        تابع إلى صفحة الدفع
        <ExternalLink className="w-4 h-4" />
      </a>
    );
  }

  if (shape.kind === 'qr') {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="w-40 h-40 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col items-center justify-center gap-2 text-center p-3">
          <QrCode className="w-12 h-12 text-gray-400" />
          <span className="text-[10px] text-gray-400 break-all line-clamp-2">{shape.qr}</span>
        </div>
        <p className="text-xs text-gray-500">امسح الرمز عبر تطبيق محفظتك لإتمام الدفع.</p>
        {shape.code && (
          <button
            onClick={() => copy(shape.code!)}
            className="flex items-center gap-2 text-sm font-mono font-bold text-gray-800 bg-gray-100 px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors"
          >
            {shape.code}
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
          </button>
        )}
        {shape.deepLink && (
          <a href={shape.deepLink} className="text-sm font-semibold text-orange-600 hover:text-orange-700">
            فتح في التطبيق
          </a>
        )}
      </div>
    );
  }

  if (shape.kind === 'code') {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-gray-500">أدخل هذا الرمز في تطبيق الدفع:</p>
        <button
          onClick={() => copy(shape.code)}
          className="flex items-center gap-2 text-base font-mono font-bold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl hover:bg-gray-200 transition-colors"
        >
          {shape.code}
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
        </button>
      </div>
    );
  }

  return (
    <div className="text-center text-sm text-gray-500">
      <p className="mb-2">تم إنشاء طلب الدفع. اتبع التعليمات لإتمام العملية.</p>
      <pre className="text-[10px] text-gray-400 bg-gray-50 rounded-xl p-3 overflow-auto text-start" dir="ltr">
        {JSON.stringify(shape.payload, null, 2)}
      </pre>
    </div>
  );
}

function TopupModal({ onClose }: { onClose: () => void }) {
  const [amount, setAmount]       = useState('');
  const [currency, setCurrency]   = useState<WalletCurrency>('SYP');
  const [submitting, setSubmitting] = useState(false);
  const [unavailable, setUnavailable] = useState(false); // 503 — calm, not an error
  const [clientData, setClientData]   = useState<Record<string, unknown> | null>(null);

  const valid = AMOUNT_RE.test(amount) && Number(amount) > 0;

  const submit = async () => {
    if (!valid) return;
    setSubmitting(true);
    setUnavailable(false);
    try {
      const res = await walletService.createOnlineTopup({ amount, currency });
      setClientData(res.clientData);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setUnavailable(true);
      } else {
        toast.error(err instanceof ApiError ? err.message : 'تعذّر بدء عملية الشحن.');
      }
    } finally {
      setSubmitting(false);
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
          <h3 className="text-lg font-bold text-gray-900">شحن المحفظة</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {clientData ? (
          <div className="space-y-4">
            <ClientDataView data={clientData} />
            <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              إغلاق
            </button>
          </div>
        ) : unavailable ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-7 h-7 text-orange-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700">شحن إلكتروني غير متاح حالياً، سيتوفر قريباً.</p>
            <p className="text-xs text-gray-400 mt-1">يمكنك شحن محفظتك نقداً عبر أحد مندوبينا في هذه الأثناء.</p>
            <button onClick={onClose} className="mt-5 w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              حسناً
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Currency toggle */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">العملة</label>
              <div className="grid grid-cols-2 gap-2">
                {(['SYP', 'USD'] as WalletCurrency[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={cn(
                      'py-2.5 rounded-xl text-sm font-bold border transition-colors',
                      currency === c
                        ? 'bg-orange-50 border-orange-300 text-orange-600'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50',
                    )}
                  >
                    {c === 'SYP' ? 'ليرة سورية' : 'دولار'}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">المبلغ</label>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg font-bold text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 text-start"
                dir="ltr"
              />
              {amount !== '' && !valid && (
                <p className="text-xs text-red-500 mt-1.5">أدخل مبلغاً صحيحاً (حتى منزلتين عشريتين).</p>
              )}
            </div>

            <button
              onClick={submit}
              disabled={!valid || submitting}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-l from-orange-500 to-pink-500 text-white text-sm font-bold hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {submitting ? 'جارٍ المعالجة…' : 'متابعة الدفع'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Skeletons ───────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="bg-white shadow-pebble rounded-card p-4 flex items-center gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-200 rounded w-1/4" />
      </div>
      <div className="h-4 w-20 bg-gray-200 rounded" />
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function WalletPage() {
  const router          = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const gate            = useStoreGate();

  const [wallet, setWallet]         = useState<WalletData | null>(null);
  const [walletError, setWalletErr] = useState(false);
  const [loadingWallet, setLW]      = useState(true);

  const [txns, setTxns]             = useState<WalletTransaction[]>([]);
  const [meta, setMeta]             = useState<PageMeta | null>(null);
  const [loadingTxns, setLT]        = useState(true);
  const [txnError, setTxnErr]       = useState(false);

  const [page, setPage]             = useState(1);
  const [currencyFilter, setCF]     = useState<'ALL' | WalletCurrency>('ALL');
  const [typeFilter, setTF]         = useState<WalletTxType | 'ALL'>('ALL');
  const [transferOpen, setTransferOpen] = useState(false);
  const [transfersKey, setTransfersKey] = useState(0); // bump to reload TransferHistory

  // Auth gate
  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  // silent: refresh in place with no spinner flip and no error-state change (focus/socket
  // refetches must never flash the UI or replace good data with an error card).
  // Options-object (not a boolean) so `onClick={loadWallet}` can't smuggle a MouseEvent in.
  const loadWallet = useCallback((opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) { setLW(true); setWalletErr(false); }
    walletService.getWallet()
      .then(setWallet)
      .catch(() => { if (!silent) setWalletErr(true); })
      .finally(() => { if (!silent) setLW(false); });
  }, []);

  const loadTxns = useCallback((opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) { setLT(true); setTxnErr(false); }
    walletService.getTransactions({
      page,
      limit: 20,
      currency: currencyFilter === 'ALL' ? undefined : currencyFilter,
      type:     typeFilter === 'ALL' ? undefined : typeFilter,
    })
      .then((res) => { setTxns(res.data); setMeta(res.meta); })
      .catch(() => { if (!silent) setTxnErr(true); })
      .finally(() => { if (!silent) setLT(false); });
  }, [page, currencyFilter, typeFilter]);

  useEffect(() => { if (isAuthenticated) loadWallet(); }, [isAuthenticated, loadWallet]);
  useEffect(() => { if (isAuthenticated) loadTxns();  }, [isAuthenticated, loadTxns]);

  // Freshness (the stale-balance incident): an admin approving a transfer while the user
  // sits on this page must land without a reload. Two triggers, both silent:
  //  - tab regains visibility/focus (throttled — focus+visibilitychange often co-fire),
  //  - a WALLET_TOPUP notification arrives via the socket (SocketManager dispatches
  //    forsa:wallet-credited; unthrottled — a real credit always warrants a refetch).
  const lastSilentRef = useRef(0);
  useEffect(() => {
    if (!isAuthenticated) return;
    const silentReload = (force: boolean) => {
      const now = Date.now();
      if (!force && now - lastSilentRef.current < 5000) return;
      lastSilentRef.current = now;
      loadWallet({ silent: true });
      loadTxns({ silent: true });
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') silentReload(false); };
    const onFocus = () => silentReload(false);
    const onCredited = () => silentReload(true);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener(WALLET_CREDITED_EVENT, onCredited);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(WALLET_CREDITED_EVENT, onCredited);
    };
  }, [isAuthenticated, loadWallet, loadTxns]);

  // Reset to page 1 when a filter changes
  const onCurrency = (c: 'ALL' | WalletCurrency) => { setCF(c); setPage(1); };
  const onType     = (t: WalletTxType | 'ALL')   => { setTF(t); setPage(1); };

  if (!isAuthenticated) return null;

  // A business awaiting approval has no wallet surface — the whole /wallet router is
  // requireApprovedStore'd server-side, so every call here would 403 anyway.
  if (gate.locked || (gate.gated && gate.loading)) return <StoreGateBlock surface="wallet" />;

  const balanceFor = (c: string) => wallet?.balances.find((b) => b.currency === c)?.balance ?? '0';
  const frozen = wallet?.status === 'FROZEN';

  return (
    <>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-orange-500" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900">محفظتي</h1>
              <p className="text-sm text-gray-500">رصيدك وعملياتك المالية.</p>
            </div>
          </div>
          <button
            onClick={() => setTransferOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-l from-orange-500 to-pink-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:opacity-95 transition-opacity shrink-0"
          >
            <Plus className="w-4 h-4" />
            شحن
          </button>
        </div>

        {/* Frozen banner */}
        {frozen && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-4">
            <Lock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-700">محفظتك مجمّدة مؤقتاً</p>
              <p className="text-xs text-amber-600 mt-0.5">لا يمكنك الإنفاق حالياً، لكن يمكنك الشحن. تواصل مع الدعم للمزيد.</p>
            </div>
          </div>
        )}

        {/* Balance cards */}
        {loadingWallet ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <div className="h-28 rounded-2xl bg-gray-200 animate-pulse" />
            <div className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
          </div>
        ) : walletError ? (
          <div className="bg-white shadow-pebble rounded-card p-6 mb-6 text-center">
            <AlertTriangle className="w-8 h-8 text-red-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-3">تعذّر تحميل رصيد المحفظة.</p>
            <button onClick={() => loadWallet()} className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700">
              <RefreshCw className="w-4 h-4" /> إعادة المحاولة
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {/* SYP — primary gradient */}
            <div className="rounded-2xl p-5 bg-gradient-to-bl from-orange-500 to-pink-500 text-white shadow-sm">
              <div className="flex items-center gap-2 mb-3 opacity-90">
                <Wallet className="w-4 h-4" />
                <span className="text-xs font-semibold">الرصيد بالليرة السورية</span>
              </div>
              <p className="text-2xl font-extrabold tracking-tight" dir="ltr">{formatAmount(balanceFor('SYP'))}</p>
              <p className="text-xs opacity-80 mt-1">ل.س</p>
            </div>
            {/* USD — secondary */}
            <div className="rounded-card p-5 bg-white shadow-pebble">
              <div className="flex items-center gap-2 mb-3 text-gray-400">
                <Wallet className="w-4 h-4" />
                <span className="text-xs font-semibold">الرصيد بالدولار</span>
              </div>
              <p className="text-2xl font-extrabold tracking-tight text-gray-900" dir="ltr">${formatAmount(balanceFor('USD'))}</p>
              <p className="text-xs text-gray-400 mt-1">USD</p>
            </div>
          </div>
        )}

        {/* Top-up requests (manual transfers) */}
        <TransferHistory key={transfersKey} />

        {/* Transactions */}
        <div className="bg-white shadow-pebble rounded-card overflow-hidden">
          {/* Filters */}
          <div className="p-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              {([['ALL', 'الكل'], ['SYP', 'ل.س'], ['USD', '$']] as Array<['ALL' | WalletCurrency, string]>).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => onCurrency(v)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
                    currencyFilter === v ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <select
              value={typeFilter}
              onChange={(e) => onType(e.target.value as WalletTxType | 'ALL')}
              className="ms-auto text-xs font-semibold text-gray-600 bg-gray-100 border-0 rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-200 cursor-pointer"
            >
              {TYPE_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>

          {/* List */}
          {loadingTxns ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : txnError ? (
            <div className="py-16 text-center">
              <AlertTriangle className="w-8 h-8 text-red-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-3">تعذّر تحميل العمليات.</p>
              <button onClick={() => loadTxns()} className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700">
                <RefreshCw className="w-4 h-4" /> إعادة المحاولة
              </button>
            </div>
          ) : txns.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-7 h-7 text-orange-300" />
              </div>
              <h2 className="text-base font-bold text-gray-800 mb-1">لا توجد عمليات بعد</h2>
              <p className="text-sm text-gray-500">ستظهر هنا عمليات الشحن والدفع على محفظتك.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {txns.map((t) => {
                const credit = t.direction === 'CREDIT';
                return (
                  <div key={t.id} className="flex items-center gap-3 p-4">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', credit ? 'bg-green-50' : 'bg-red-50')}>
                      {credit
                        ? <ArrowDownLeft className="w-5 h-5 text-green-500" />
                        : <ArrowUpRight className="w-5 h-5 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{typeLabel(t.type)}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{formatDateTime(t.createdAt)}</p>
                    </div>
                    <div className="text-end shrink-0">
                      <p className={cn('text-sm font-bold tabular-nums', credit ? 'text-green-600' : 'text-red-600')} dir="ltr">
                        {credit ? '+' : '−'}{formatMoney(t.amount, t.currency)}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5" dir="ltr">
                        الرصيد: {formatMoney(t.balanceAfter, t.currency)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loadingTxns && !txnError && txns.length > 0 && meta && (meta.hasNextPage || page > 1) && (
            <div className="flex items-center justify-between p-3 border-t border-gray-100">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 text-sm font-semibold text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900 transition-colors"
              >
                <ChevronRight className="w-4 h-4" /> السابق
              </button>
              <span className="text-xs text-gray-400">صفحة {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!meta.hasNextPage}
                className="flex items-center gap-1 text-sm font-semibold text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900 transition-colors"
              >
                التالي <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Back link */}
        <div className="mt-6 text-center">
          <Link href="/account" className="inline-flex items-center gap-1 text-sm text-orange-500 hover:text-orange-700 font-medium">
            <ArrowLeft className="w-4 h-4" /> العودة إلى حسابي
          </Link>
        </div>
      </div>

      {transferOpen && (
        <TransferTopupModal
          onClose={() => {
            setTransferOpen(false);
            loadWallet();
            loadTxns();
            setTransfersKey((k) => k + 1); // reflect the new request / any confirmation
          }}
        />
      )}
    </>
  );
}
