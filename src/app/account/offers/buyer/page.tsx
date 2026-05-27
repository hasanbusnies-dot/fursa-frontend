'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingCart, Search, ChevronDown, CheckCircle2, XCircle,
  Clock, ArrowLeftRight, ImageOff, RefreshCw, Undo2, MessageCircle, Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { offersService, type Offer, type OfferStatus } from '@/services/offers.service';
import { messagesService } from '@/services/messages.service';
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

function sellerName(offer: Offer): string {
  const p = offer.listing?.user?.profile;
  if (p?.firstName || p?.lastName) return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
  return 'البائع';
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
  onWithdraw,
  onAccept,
  onReject,
  onReOffer,
  onMessage,
  actionLoading,
}: {
  offer: Offer;
  onWithdraw: (id: string) => void;
  onAccept:   (id: string) => void;
  onReject:   (id: string) => void;
  onReOffer:  (id: string, amount: number) => void;
  onMessage:  (listingId: string) => void;
  actionLoading: string | null;
}) {
  const [newOfferOpen,  setNewOfferOpen]  = useState(false);
  const [newOfferInput, setNewOfferInput] = useState('');

  const thumb = offer.listing?.images?.find((i) => i.isPrimary)?.url
    ?? offer.listing?.images?.[0]?.url;
  const isPending    = offer.status === 'PENDING';
  const isCountered  = offer.status === 'COUNTERED';
  const isLoading    = actionLoading === offer.id;
  const name         = sellerName(offer);
  const sellerPhone  = (offer.listing?.user as any)?.phone as string | undefined;

  const parsedNewOffer = parseFloat(newOfferInput);
  const newOfferValid  = !Number.isNaN(parsedNewOffer) && parsedNewOffer > 0;

  function handleNewOfferSubmit() {
    if (!newOfferValid || isLoading) return;
    onReOffer(offer.id, parsedNewOffer);
    setNewOfferOpen(false);
    setNewOfferInput('');
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-sm transition-shadow space-y-4">
      {/* Top row */}
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
          <p className="text-xs text-gray-400 mt-0.5">
            {name} · {formatDate(offer.createdAt)}
          </p>
          {offer.message && (
            <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">"{offer.message}"</p>
          )}
        </div>

        <StatusBadge status={offer.status} />
      </div>

      {/* Amount comparison row */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
        <div className="text-center">
          <p className="text-[10px] text-gray-400 mb-0.5">سعر الإعلان</p>
          <p className="text-sm font-bold text-gray-600">
            {offer.listing?.price
              ? formatPrice(offer.listing.price, offer.listing.currency ?? 'SYP')
              : '—'}
          </p>
        </div>
        <ArrowLeftRight className="w-4 h-4 text-gray-300 mx-2" />
        <div className="text-center">
          <p className="text-[10px] text-gray-400 mb-0.5">عرضي</p>
          <p className="text-lg font-extrabold text-orange-600">
            {formatPrice(offer.amount, offer.currency)}
          </p>
        </div>
      </div>

      {/* Counter-offer banner — seller's requested price */}
      {isCountered && offer.counterAmount != null && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-blue-500 shrink-0" />
            <p className="text-xs font-semibold text-blue-700">طلب البائع:</p>
          </div>
          <p className="text-lg font-extrabold text-blue-700">
            {formatPrice(offer.counterAmount, offer.currency)}
          </p>
        </div>
      )}

      {/* COUNTERED — action buttons for buyer */}
      {isCountered && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {/* Accept */}
            <button
              onClick={() => onAccept(offer.id)}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1 text-xs font-semibold py-2.5 px-2 rounded-xl bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              قبول العرض
            </button>

            {/* Reject */}
            <button
              onClick={() => onReject(offer.id)}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1 text-xs font-semibold py-2.5 px-2 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              رفض العرض
            </button>

            {/* New offer */}
            <button
              onClick={() => setNewOfferOpen((v) => !v)}
              disabled={isLoading}
              className={cn(
                'inline-flex items-center justify-center gap-1 text-xs font-semibold py-2.5 px-2 rounded-xl border transition-colors disabled:opacity-50',
                newOfferOpen
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-blue-300 text-blue-600 hover:bg-blue-50',
              )}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
              عرض جديد
            </button>
          </div>

          {/* Inline new-offer input */}
          {newOfferOpen && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2.5">
              <p className="text-xs font-semibold text-blue-700">أدخل سعرك الجديد</p>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  value={newOfferInput}
                  onChange={(e) => setNewOfferInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNewOfferSubmit()}
                  placeholder="المبلغ"
                  disabled={isLoading}
                  className="w-full border border-blue-200 bg-white rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 pe-12 disabled:opacity-60"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none select-none">
                  {offer.currency === 'USD' ? '$' : 'ل.س'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleNewOfferSubmit}
                  disabled={!newOfferValid || isLoading}
                  className="flex-1 text-xs font-semibold py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'جارٍ الإرسال…' : 'إرسال'}
                </button>
                <button
                  onClick={() => { setNewOfferOpen(false); setNewOfferInput(''); }}
                  className="flex-1 text-xs font-semibold py-2 rounded-xl border border-blue-200 text-blue-600 hover:bg-white transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Withdraw — only for pending */}
      {isPending && (
        <div className="flex justify-end">
          <button
            onClick={() => onWithdraw(offer.id)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
          >
            <Undo2 className="w-3.5 h-3.5" />
            {isLoading ? 'جارٍ السحب…' : 'سحب العرض'}
          </button>
        </div>
      )}

      {/* Accepted banner + contact buttons */}
      {offer.status === 'ACCEPTED' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2.5">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-green-700 leading-relaxed">
              وافق البائع على عرضك. تواصل معه لإتمام الصفقة.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onMessage(offer.listing?.id ?? offer.listingId)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl bg-green-600 hover:bg-green-700 text-white transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              مراسلة البائع
            </button>
            {sellerPhone ? (
              <a
                href={`tel:${sellerPhone}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl border border-green-300 bg-white hover:bg-green-50 text-green-700 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                اتصال
              </a>
            ) : (
              <div className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl border border-green-200 bg-white text-green-400 cursor-default select-none">
                <Phone className="w-3.5 h-3.5" />
                لا يوجد هاتف
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rejected banner */}
      {offer.status === 'REJECTED' && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs font-semibold text-red-600">
            رفض البائع عرضك. يمكنك تصفح إعلانات مشابهة.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Sort / Tab types ──────────────────────────────────────────────────────────

type SortKey = 'newest' | 'price_desc' | 'price_asc';
type TabKey  = 'process' | 'all';

const SORT_LABELS: Record<SortKey, string> = {
  newest:     'الأحدث',
  price_desc: 'الأعلى سعراً',
  price_asc:  'الأقل سعراً',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BuyerOffersPage() {
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
    offersService.getBuyerOffers()
      .then((data) => { if (!cancelled) setOffers(data); })
      .catch(() => { if (!cancelled) setError('حدث خطأ أثناء تحميل العروض.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mounted, isAuthenticated]);

  async function handleMessage(listingId: string) {
    try {
      const room = await messagesService.createOrGetRoom(listingId);
      router.push(`/messages?roomId=${room.id}`);
    } catch {
      toast.error('تعذّر فتح المحادثة.');
    }
  }

  async function handleWithdraw(id: string) {
    setActionLoading(id);
    try {
      const updated = await offersService.updateStatus(id, 'WITHDRAWN');
      setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
      toast.success('تم سحب عرضك.');
    } catch {
      toast.error('تعذّر سحب العرض.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAccept(id: string) {
    setActionLoading(id);
    try {
      const updated = await offersService.updateStatus(id, 'ACCEPTED');
      setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
      toast.success('تم قبول العرض المضاد بنجاح.');
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
      toast.success('تم رفض العرض المضاد.');
    } catch {
      toast.error('تعذّر رفض العرض.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReOffer(id: string, amount: number) {
    setActionLoading(id);
    try {
      const updated = await offersService.reOffer(id, amount);
      // Explicitly clear counterAmount so the seller's previous counter never lingers
      // in local state regardless of what the backend omits from the response.
      setOffers((prev) => prev.map((o) =>
        o.id === id ? { ...o, ...updated, counterAmount: null } : o,
      ));
      toast.success('تم إرسال عرضك الجديد بنجاح');
    } catch {
      toast.error('تعذّر إرسال العرض الجديد.');
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

  const activeOffers = sortedOffers.filter((o) =>
    o.status === 'PENDING' || o.status === 'ACCEPTED' || o.status === 'COUNTERED',
  );
  const visibleOffers = activeTab === 'process' ? activeOffers : sortedOffers;

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: 'process', label: 'العملية', count: activeOffers.length  },
    { key: 'all',     label: 'الكل',    count: sortedOffers.length  },
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
          <h1 className="text-2xl font-bold text-gray-900">عروض الشراء</h1>
          <p className="text-sm text-gray-500 mt-0.5">العروض التي قدمتها على إعلانات البائعين</p>
        </div>
        <Link
          href="/listings"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm shrink-0"
        >
          <Search className="w-4 h-4" />
          تصفح الإعلانات
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
              <div className="w-24 h-24 rounded-3xl bg-blue-50 flex items-center justify-center mb-6">
                <ShoppingCart className="w-12 h-12 text-blue-300" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                لم تقم بتقديم أي عروض بعد
              </h2>
              <p className="text-sm text-gray-500 mb-8 max-w-sm leading-relaxed">
                تصفح الإعلانات، وقدم عروضك للبائعين للحصول على المنتجات التي تريدها بأفضل الأسعار.
              </p>
              <Link
                href="/listings"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
              >
                <Search className="w-4 h-4" />
                تصفح الإعلانات
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleOffers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onWithdraw={handleWithdraw}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onReOffer={handleReOffer}
                  onMessage={handleMessage}
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
