'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Tag, Plus, ChevronDown, CheckCircle2, XCircle,
  Clock, ArrowLeftRight, ImageOff, RefreshCw, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { offersService, type Offer, type OfferStatus } from '@/services/offers.service';
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

function buyerName(offer: Offer): string {
  const p = offer.buyer?.profile;
  if (p?.firstName || p?.lastName) return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
  return offer.buyer?.email?.split('@')[0] ?? 'مشترٍ';
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OfferStatus, {
  label: string;
  icon: React.ReactNode;
  className: string;
}> = {
  PENDING: {
    label: 'قيد الانتظار',
    icon: <Clock className="w-3 h-3" />,
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  ACCEPTED: {
    label: 'مقبول',
    icon: <CheckCircle2 className="w-3 h-3" />,
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  REJECTED: {
    label: 'مرفوض',
    icon: <XCircle className="w-3 h-3" />,
    className: 'bg-red-50 text-red-600 border-red-200',
  },
  COUNTERED: {
    label: 'عرض مضاد',
    icon: <ArrowLeftRight className="w-3 h-3" />,
    className: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  WITHDRAWN: {
    label: 'مسحوب',
    icon: <XCircle className="w-3 h-3" />,
    className: 'bg-gray-100 text-gray-500 border-gray-200',
  },
};

function StatusBadge({ status }: { status: OfferStatus }) {
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

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex gap-4 animate-pulse">
      <div className="w-16 h-14 rounded-xl bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2.5">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-5 bg-gray-200 rounded w-1/4" />
        <div className="h-3 bg-gray-100 rounded w-1/3" />
      </div>
      <div className="h-7 w-24 bg-gray-200 rounded-full shrink-0" />
    </div>
  );
}

// ── Offer card ────────────────────────────────────────────────────────────────

function OfferCard({
  offer,
  onAccept,
  onReject,
  onCounter,
  actionLoading,
}: {
  offer: Offer;
  onAccept:  (id: string) => void;
  onReject:  (id: string) => void;
  onCounter: (id: string, counterAmount: number) => void;
  actionLoading: string | null;
}) {
  const [counterOpen,  setCounterOpen]  = useState(false);
  const [counterInput, setCounterInput] = useState('');

  const thumb      = offer.listing?.images?.find((i) => i.isPrimary)?.url
    ?? offer.listing?.images?.[0]?.url;
  const isPending  = offer.status === 'PENDING';
  const isLoading  = actionLoading === offer.id;
  const name       = buyerName(offer);
  const currency   = offer.currency;
  const currLabel  = currency === 'USD' ? '$' : 'ل.س';

  function submitCounter() {
    const val = parseFloat(counterInput);
    if (!val || val <= 0) return;
    onCounter(offer.id, val);
    setCounterOpen(false);
    setCounterInput('');
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-sm transition-shadow space-y-4">
      {/* Top row: thumbnail + listing info + status */}
      <div className="flex items-start gap-4">
        <Link href={`/listings/${offer.listingId}`} className="shrink-0">
          <div className="w-16 h-14 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
            {thumb
              ? <img src={thumb} alt="" className="w-full h-full object-cover" />
              : <ImageOff className="w-5 h-5 text-gray-300" />}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/listings/${offer.listingId}`}
            className="text-sm font-semibold text-gray-800 hover:text-orange-600 transition-colors truncate block"
          >
            {offer.listing?.title ?? 'الإعلان'}
          </Link>
          <p className="text-xs text-gray-400 mt-0.5">{name} · {formatDate(offer.createdAt)}</p>
          {offer.message && (
            <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">"{offer.message}"</p>
          )}
        </div>
        <StatusBadge status={offer.status} />
      </div>

      {/* Offer amount row */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
        <span className="text-xs text-gray-500">العرض المقدَّم</span>
        <span className="text-lg font-extrabold text-orange-600">
          {formatPrice(offer.amount, offer.currency)}
        </span>
      </div>

      {/* Action buttons — only for pending offers */}
      {isPending && (
        <div className="space-y-2">
          {/* Primary actions row */}
          <div className="flex gap-2">
            <button
              onClick={() => onAccept(offer.id)}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isLoading ? 'جارٍ المعالجة…' : 'قبول العرض'}
            </button>
            <button
              onClick={() => onReject(offer.id)}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              رفض العرض
            </button>
            <button
              onClick={() => setCounterOpen((v) => !v)}
              disabled={isLoading}
              className={cn(
                'flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl transition-colors disabled:opacity-50',
                counterOpen
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100',
              )}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              عرض مضاد
            </button>
          </div>

          {/* Inline counter offer panel */}
          {counterOpen && (
            <div className="flex gap-2 items-center bg-blue-50 border border-blue-100 rounded-xl p-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  min={1}
                  value={counterInput}
                  onChange={(e) => setCounterInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitCounter()}
                  placeholder="السعر المقترح"
                  className="w-full border border-blue-200 bg-white rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300 pe-12"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none font-medium">
                  {currLabel}
                </span>
              </div>
              <button
                onClick={submitCounter}
                disabled={!counterInput || parseFloat(counterInput) <= 0}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <Send className="w-3 h-3" />
                إرسال
              </button>
              <button
                onClick={() => { setCounterOpen(false); setCounterInput(''); }}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-2 whitespace-nowrap"
              >
                إلغاء
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sort dropdown ─────────────────────────────────────────────────────────────

type SortKey = 'newest' | 'price_desc' | 'price_asc';

const SORT_LABELS: Record<SortKey, string> = {
  newest:     'الأحدث',
  price_desc: 'الأعلى سعراً',
  price_asc:  'الأقل سعراً',
};

// ── Tabs ──────────────────────────────────────────────────────────────────────

type TabKey = 'process' | 'best';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SellerOffersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [mounted,       setMounted]       = useState(false);
  const [offers,        setOffers]        = useState<Offer[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [activeTab,     setActiveTab]     = useState<TabKey>('process');
  const [sort,          setSort]          = useState<SortKey>('newest');
  const [sortOpen,      setSortOpen]      = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
    offersService.getSellerOffers()
      .then((data) => { if (!cancelled) setOffers(data); })
      .catch(() => { if (!cancelled) setError('حدث خطأ أثناء تحميل العروض.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mounted, isAuthenticated]);

  async function handleAccept(id: string) {
    setActionLoading(id);
    try {
      const updated = await offersService.updateStatus(id, 'ACCEPTED');
      setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
      toast.success('تم قبول العرض بنجاح');
    } catch {
      toast.error('تعذّر قبول العرض.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: string) {
    setActionLoading(id);
    try {
      const updated = await offersService.updateStatus(id, 'REJECTED');
      setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
      toast.success('تم رفض العرض.');
    } catch {
      toast.error('تعذّر رفض العرض.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCounter(id: string, counterAmount: number) {
    setActionLoading(id);
    try {
      const updated = await offersService.counter(id, counterAmount);
      setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
      toast.success('تم إرسال العرض المضاد بنجاح.');
    } catch {
      toast.error('تعذّر إرسال العرض المضاد.');
    } finally {
      setActionLoading(null);
    }
  }

  // Client-side sort
  const sortedOffers = [...offers].sort((a, b) => {
    if (sort === 'price_desc') return b.amount - a.amount;
    if (sort === 'price_asc')  return a.amount - b.amount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // "Best offers" tab: show only accepted / highest-value pending
  const visibleOffers = activeTab === 'best'
    ? sortedOffers.filter((o) => o.status === 'ACCEPTED' || o.status === 'PENDING')
    : sortedOffers;

  const pendingCount  = offers.filter((o) => o.status === 'PENDING').length;
  const acceptedCount = offers.filter((o) => o.status === 'ACCEPTED').length;

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: 'process', label: 'العملية',      count: pendingCount  },
    { key: 'best',    label: 'أفضل العروض',  count: acceptedCount },
  ];

  if (!mounted || !isAuthenticated) {
    return (
      <div>
        <div className="h-8 w-56 bg-gray-200 rounded mb-6 animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">عروض منتجاتي</h1>
          <p className="text-sm text-gray-500 mt-0.5">إدارة العروض الواردة من المشترين على إعلاناتك</p>
        </div>
        <Link
          href="/listings/create"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          إعلان جديد
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

        {/* Tabs + Sort row */}
        <div className="flex items-center justify-between border-b border-gray-100 px-1">
          {/* Tabs */}
          <div className="flex">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2',
                  activeTab === tab.key
                    ? 'text-orange-600 border-orange-500 bg-orange-50/40'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50',
                )}
              >
                {tab.label}
                {!!tab.count && (
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
          <div className="relative px-4">
            <button
              onClick={() => setSortOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-xl transition-colors"
            >
              {SORT_LABELS[sort]}
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', sortOpen && 'rotate-180')} />
            </button>
            {sortOpen && (
              <div className="absolute end-4 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[160px]">
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
          ) : visibleOffers.length === 0 ? (
            /* ── Empty state ── */
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
              <div className="w-24 h-24 rounded-3xl bg-orange-50 flex items-center justify-center mb-6">
                <Tag className="w-12 h-12 text-orange-300" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                ليس لديك أي عروض بعد
              </h2>
              <p className="text-sm text-gray-500 mb-8 max-w-sm leading-relaxed">
                أضف منتجاتك الآن، وابدأ في تقييم العروض الواردة من المشترين لتحقيق الأرباح.
              </p>
              <Link
                href="/listings/create"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                أضف إعلان الآن
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleOffers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onCounter={handleCounter}
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
