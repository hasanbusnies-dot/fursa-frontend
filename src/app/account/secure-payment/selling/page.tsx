'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package, FileText, RefreshCw, CheckCircle2, XCircle,
  Clock, Truck, ImageOff, ChevronDown, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  securePaymentService,
  type SecureTransaction,
  type TransactionStatus,
} from '@/services/secure-payment.service';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(amount: number, currency: 'SYP' | 'USD') {
  const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(amount));
  return currency === 'USD' ? `$${n}` : `${n} ل.س`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ar-SY', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function buyerName(tx: SecureTransaction): string {
  const p = tx.buyer?.profile;
  if (p?.firstName || p?.lastName) return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
  return tx.buyer?.email?.split('@')[0] ?? 'المشتري';
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TransactionStatus, {
  label: string;
  icon: React.ReactNode;
  className: string;
}> = {
  PENDING: {
    label: 'قيد الانتظار',
    icon: <Clock className="w-3 h-3" />,
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  PAYMENT_RECEIVED: {
    label: 'تم استلام الدفع',
    icon: <CheckCircle2 className="w-3 h-3" />,
    className: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  SHIPPED: {
    label: 'تم الشحن',
    icon: <Truck className="w-3 h-3" />,
    className: 'bg-purple-50 text-purple-600 border-purple-200',
  },
  DELIVERED: {
    label: 'تم التوصيل',
    icon: <Package className="w-3 h-3" />,
    className: 'bg-teal-50 text-teal-600 border-teal-200',
  },
  COMPLETED: {
    label: 'مكتملة',
    icon: <CheckCircle2 className="w-3 h-3" />,
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  CANCELLED: {
    label: 'ملغاة',
    icon: <XCircle className="w-3 h-3" />,
    className: 'bg-red-50 text-red-600 border-red-200',
  },
  REFUNDED: {
    label: 'مُستردَّة',
    icon: <RefreshCw className="w-3 h-3" />,
    className: 'bg-gray-100 text-gray-500 border-gray-200',
  },
};

function StatusBadge({ status }: { status: TransactionStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0',
      cfg.className,
    )}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── Progress stepper ──────────────────────────────────────────────────────────

const STEPS: { status: TransactionStatus; label: string }[] = [
  { status: 'PENDING',          label: 'الطلب' },
  { status: 'PAYMENT_RECEIVED', label: 'الدفع' },
  { status: 'SHIPPED',          label: 'الشحن' },
  { status: 'DELIVERED',        label: 'التوصيل' },
  { status: 'COMPLETED',        label: 'مكتمل' },
];

const STEP_ORDER: Record<TransactionStatus, number> = {
  PENDING: 0, PAYMENT_RECEIVED: 1, SHIPPED: 2, DELIVERED: 3, COMPLETED: 4,
  CANCELLED: -1, REFUNDED: -1,
};

function ProgressStepper({ status }: { status: TransactionStatus }) {
  const current = STEP_ORDER[status] ?? -1;
  if (current < 0) return null;
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const done   = STEP_ORDER[step.status] <= current;
        const isCurr = STEP_ORDER[step.status] === current;
        return (
          <div key={step.status} className="flex items-center gap-0 flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-colors shrink-0',
                done
                  ? isCurr
                    ? 'bg-orange-500 text-white ring-2 ring-orange-200'
                    : 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-400',
              )}>
                {done && !isCurr ? '✓' : i + 1}
              </div>
              <span className={cn(
                'text-[9px] text-center leading-tight truncate w-full text-center',
                done ? (isCurr ? 'text-orange-600 font-bold' : 'text-green-600 font-semibold') : 'text-gray-400',
              )}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'h-0.5 flex-1 mx-0.5 mb-4 transition-colors',
                STEP_ORDER[step.status] < current ? 'bg-green-400' : 'bg-gray-200',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Ship modal ────────────────────────────────────────────────────────────────

function ShipModal({
  tx,
  onClose,
  onConfirm,
}: {
  tx: SecureTransaction;
  onClose: () => void;
  onConfirm: (id: string, trackingNumber?: string) => void;
}) {
  const [tracking, setTracking] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-900">تأكيد الشحن</h3>
        <p className="text-sm text-gray-500">
          المنتج: <span className="font-medium text-gray-700">{tx.listing?.title ?? 'المنتج'}</span>
        </p>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            رقم التتبع <span className="text-gray-400 font-normal">(اختياري)</span>
          </label>
          <input
            type="text"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="مثال: 1Z999AA10123456784"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onConfirm(tx.id, tracking.trim() || undefined)}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            تأكيد الشحن
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 animate-pulse">
      <div className="flex gap-4">
        <div className="w-16 h-14 rounded-xl bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
        </div>
        <div className="h-7 w-24 bg-gray-200 rounded-full shrink-0" />
      </div>
      <div className="h-8 bg-gray-100 rounded-xl w-full" />
    </div>
  );
}

// ── Transaction card ──────────────────────────────────────────────────────────

function TransactionCard({
  tx,
  onShip,
  onCancel,
  actionLoading,
}: {
  tx: SecureTransaction;
  onShip:   (tx: SecureTransaction) => void;
  onCancel: (id: string) => void;
  actionLoading: string | null;
}) {
  const thumb = tx.listing?.images?.find((i) => i.isPrimary)?.url
    ?? tx.listing?.images?.[0]?.url;
  const isLoading  = actionLoading === tx.id;
  const canShip    = tx.status === 'PAYMENT_RECEIVED';
  const canCancel  = tx.status === 'PENDING';
  const isTerminal = tx.status === 'COMPLETED' || tx.status === 'CANCELLED' || tx.status === 'REFUNDED';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-sm transition-shadow space-y-4">
      {/* Header row */}
      <div className="flex items-start gap-4">
        <Link href={`/listings/${tx.listingId}`} className="shrink-0">
          <div className="w-16 h-14 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
            {thumb
              ? <img src={thumb} alt="" className="w-full h-full object-cover" />
              : <ImageOff className="w-5 h-5 text-gray-300" />}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <Link
            href={`/listings/${tx.listingId}`}
            className="text-sm font-semibold text-gray-800 hover:text-orange-600 transition-colors truncate block"
          >
            {tx.listing?.title ?? 'المنتج'}
          </Link>
          <p className="text-xs text-gray-400 mt-0.5">
            المشتري: {buyerName(tx)} · {formatDate(tx.createdAt)}
          </p>
          {tx.trackingNumber && (
            <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
              رقم التتبع: {tx.trackingNumber}
            </p>
          )}
          {tx.shippingAddress && (
            <p className="text-[11px] text-gray-400 mt-0.5 truncate" title={tx.shippingAddress}>
              العنوان: {tx.shippingAddress}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={tx.status} />
          <span className="text-sm font-extrabold text-orange-600">
            {formatPrice(tx.amount, tx.currency)}
          </span>
        </div>
      </div>

      {/* Progress stepper — only for active transactions */}
      {!isTerminal && (
        <div className="px-2">
          <ProgressStepper status={tx.status} />
        </div>
      )}

      {/* Awaiting payment hint */}
      {tx.status === 'PENDING' && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-2.5 text-xs text-yellow-700 font-medium">
          في انتظار تحويل المشتري للمبلغ إلى حساب الضمان.
        </div>
      )}

      {/* Action buttons */}
      {(canShip || canCancel) && (
        <div className="flex gap-2 pt-1">
          {canShip && (
            <button
              onClick={() => onShip(tx)}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50"
            >
              <Truck className="w-3.5 h-3.5" />
              {isLoading ? 'جارٍ التحديث…' : 'تأكيد الشحن'}
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => onCancel(tx.id)}
              disabled={isLoading}
              className={cn(
                'flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-4 rounded-xl',
                'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50',
                canShip ? '' : 'flex-1',
              )}
            >
              <XCircle className="w-3.5 h-3.5" />
              {isLoading ? 'جارٍ الإلغاء…' : 'إلغاء الطلب'}
            </button>
          )}
        </div>
      )}

      {/* Terminal status notes */}
      {tx.status === 'COMPLETED' && tx.completedAt && (
        <p className="text-xs text-green-600 font-medium">
          اكتملت في {formatDate(tx.completedAt)}
        </p>
      )}
      {tx.status === 'CANCELLED' && (
        <p className="text-xs text-red-500 font-medium">تم إلغاء هذه العملية.</p>
      )}
      {tx.status === 'REFUNDED' && (
        <p className="text-xs text-gray-500 font-medium">تم استرداد المبلغ للمشتري.</p>
      )}
    </div>
  );
}

// ── Tab + Sort types ──────────────────────────────────────────────────────────

type TabKey  = 'current' | 'completed' | 'cancelled';
type SortKey = 'newest' | 'oldest' | 'price_desc';

const ACTIVE_STATUSES   = new Set<TransactionStatus>(['PENDING', 'PAYMENT_RECEIVED', 'SHIPPED', 'DELIVERED']);
const COMPLETE_STATUSES = new Set<TransactionStatus>(['COMPLETED', 'REFUNDED']);
const CANCEL_STATUSES   = new Set<TransactionStatus>(['CANCELLED']);

const SORT_LABELS: Record<SortKey, string> = {
  newest:     'الأحدث',
  oldest:     'الأقدم',
  price_desc: 'الأعلى سعراً',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SellingTransactionsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [mounted,       setMounted]       = useState(false);
  const [transactions,  setTransactions]  = useState<SecureTransaction[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [activeTab,     setActiveTab]     = useState<TabKey>('current');
  const [sort,          setSort]          = useState<SortKey>('newest');
  const [sortOpen,      setSortOpen]      = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [shipTarget,    setShipTarget]    = useState<SecureTransaction | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
  }, [mounted, isAuthenticated, router]);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    securePaymentService.getSellingTransactions()
      .then((data) => { if (!cancelled) setTransactions(data); })
      .catch(() => { if (!cancelled) setError('حدث خطأ أثناء تحميل عمليات البيع.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mounted, isAuthenticated]);

  async function handleShip(id: string, trackingNumber?: string) {
    setActionLoading(id);
    setShipTarget(null);
    try {
      const updated = await securePaymentService.markAsShipped(id, trackingNumber);
      setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
      toast.success('تم تأكيد الشحن بنجاح.');
    } catch {
      toast.error('تعذّر تأكيد الشحن.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(id: string) {
    setActionLoading(id);
    try {
      const updated = await securePaymentService.cancelTransaction(id);
      setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
      toast.success('تم إلغاء العملية.');
    } catch {
      toast.error('تعذّر إلغاء العملية.');
    } finally {
      setActionLoading(null);
    }
  }

  // Filter by tab
  const tabFiltered = transactions.filter((t) => {
    if (activeTab === 'current')   return ACTIVE_STATUSES.has(t.status);
    if (activeTab === 'completed') return COMPLETE_STATUSES.has(t.status);
    return CANCEL_STATUSES.has(t.status);
  });

  // Sort
  const visible = [...tabFiltered].sort((a, b) => {
    if (sort === 'oldest')     return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sort === 'price_desc') return b.amount - a.amount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: 'current',   label: 'العمليات الحالية',  count: transactions.filter((t) => ACTIVE_STATUSES.has(t.status)).length },
    { key: 'completed', label: 'العمليات المكتملة', count: transactions.filter((t) => COMPLETE_STATUSES.has(t.status)).length },
    { key: 'cancelled', label: 'العمليات الملغاة',  count: transactions.filter((t) => CANCEL_STATUSES.has(t.status)).length },
  ];

  if (!mounted || !isAuthenticated) {
    return (
      <div>
        <div className="h-8 w-48 bg-gray-200 rounded mb-6 animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Ship modal */}
      {shipTarget && (
        <ShipModal
          tx={shipTarget}
          onClose={() => setShipTarget(null)}
          onConfirm={handleShip}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">عمليات البيع</h1>
          <p className="text-sm text-gray-500 mt-0.5">تتبع حالة مبيعاتك عبر خدمة الدفع الآمن</p>
        </div>
        <Link
          href="/account/listings"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm shrink-0"
        >
          <FileText className="w-4 h-4" />
          إعلاناتي
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

        {/* Tabs + Sort */}
        <div className="flex items-center justify-between border-b border-gray-100 px-1">
          <div className="flex overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 shrink-0',
                  activeTab === tab.key
                    ? 'text-orange-600 border-orange-500 bg-orange-50/40'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50',
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn(
                    'text-[11px] font-extrabold px-2 py-0.5 rounded-full',
                    activeTab === tab.key
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-gray-100 text-gray-500',
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="relative px-4 shrink-0">
            <button
              onClick={() => setSortOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-xl transition-colors whitespace-nowrap"
            >
              {SORT_LABELS[sort]}
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', sortOpen && 'rotate-180')} />
            </button>
            {sortOpen && (
              <div className="absolute end-4 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[150px]">
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => { setSort(key); setSortOpen(false); }}
                    className={cn(
                      'w-full text-right px-4 py-2.5 text-sm transition-colors',
                      sort === key
                        ? 'bg-orange-50 text-orange-600 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    {SORT_LABELS[key]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <RefreshCw className="w-10 h-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-700">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-orange-500 hover:text-orange-700 font-medium"
              >
                حاول مجدداً
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
              <div className="w-24 h-24 rounded-3xl bg-orange-50 flex items-center justify-center mb-6">
                <Package className="w-12 h-12 text-orange-300" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {activeTab === 'current'
                  ? 'لا توجد لديك عمليات بيع حالياً'
                  : activeTab === 'completed'
                  ? 'لا توجد عمليات مكتملة بعد'
                  : 'لا توجد عمليات ملغاة'}
              </h2>
              <p className="text-sm text-gray-500 mb-8 max-w-sm leading-relaxed">
                عند قيام أحد المشترين بشراء منتجاتك عبر الدفع الآمن ستظهر العمليات هنا.
              </p>
              {activeTab === 'current' && (
                <Link
                  href="/account/listings"
                  className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
                >
                  <FileText className="w-4 h-4" />
                  إدارة إعلاناتي
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {visible.map((tx) => (
                <TransactionCard
                  key={tx.id}
                  tx={tx}
                  onShip={setShipTarget}
                  onCancel={handleCancel}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
