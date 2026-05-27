'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, ImageOff, CheckCircle2, Clock, XCircle, Tag,
  Trash2, AlertTriangle, Pencil, ChevronLeft, ChevronRight,
  Zap,
} from 'lucide-react';
import { listingsService } from '@/services/listings.service';
import { useAuthStore } from '@/store/auth.store';
import { DopingPurchaseModal } from '@/components/dopings/DopingPurchaseModal';
import type { Listing } from '@/types';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(price: number, currency: 'SYP' | 'USD') {
  const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(price));
  return currency === 'USD' ? `$${n}` : `${n} SYP`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ar-SY', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  ACTIVE: {
    label: 'نشط',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  SOLD: {
    label: 'مباع',
    icon: <Tag className="w-3.5 h-3.5" />,
    className: 'bg-gray-100 text-gray-500 border-gray-200',
  },
  PENDING: {
    label: 'قيد المراجعة',
    icon: <Clock className="w-3.5 h-3.5" />,
    className: 'bg-orange-50 text-orange-600 border-orange-200',
  },
  REJECTED: {
    label: 'مرفوض',
    icon: <XCircle className="w-3.5 h-3.5" />,
    className: 'bg-red-50 text-red-600 border-red-200',
  },
};

function StatusBadge({ status }: { status?: string }) {
  const cfg = STATUS_CONFIG[status ?? ''] ?? {
    label: status ?? 'غير معروف',
    icon: <Clock className="w-3.5 h-3.5" />,
    className: 'bg-gray-50 text-gray-500 border-gray-200',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border', cfg.className)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteModal({
  listing,
  onConfirm,
  onCancel,
  loading,
}: {
  listing: Listing;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-1">حذف الإعلان</h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          هل أنت متأكد أنك تريد حذف إعلان <span className="font-medium text-gray-700">"{listing.title}"</span> بشكل نهائي؟
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-semibold text-white transition-colors disabled:opacity-50"
          >
            {loading ? 'جارٍ الحذف…' : 'نعم، احذف'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Listing row card ──────────────────────────────────────────────────────────

function ListingRow({
  listing,
  onMarkSold,
  onDelete,
  onDoping,
  actionLoading,
}: {
  listing: Listing;
  onMarkSold: (id: string) => void;
  onDelete: (listing: Listing) => void;
  onDoping: (listing: Listing) => void;
  actionLoading: string | null;
}) {
  const thumb     = listing.images?.find((i) => i.isPrimary)?.url ?? listing.images?.[0]?.url;
  const isSold    = listing.status === 'SOLD';
  const isActive  = listing.status === 'ACTIVE';
  const isLoading = actionLoading === listing.id;

  return (
    <div className={cn(
      'flex gap-4 items-start rounded-2xl border p-4 hover:shadow-sm transition-shadow',
      listing.hasHighlightFrame
        ? 'bg-orange-50/40 border-orange-300 border-l-4 border-l-orange-500'
        : 'bg-white border-gray-200',
    )}>
      {/* Thumbnail */}
      <Link href={`/listings/${listing.id}`} className="shrink-0">
        <div className="w-20 h-16 sm:w-28 sm:h-20 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
          {thumb ? (
            <img src={thumb} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <ImageOff className="w-6 h-6 text-gray-300" />
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <Link
            href={`/listings/${listing.id}`}
            className={cn(
              'text-sm leading-snug hover:text-orange-600 transition-colors line-clamp-2',
              listing.hasHighlightFrame ? 'font-extrabold text-black' : 'font-semibold text-gray-900',
            )}
          >
            {listing.isUrgent && (
              <span className="inline-block ms-1.5 animate-pulse bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded leading-none align-middle">
                عاجل
              </span>
            )}
            {listing.title}
          </Link>
          <StatusBadge status={listing.status} />
        </div>

        <p className="text-orange-600 font-bold text-base mb-1">
          {formatPrice(listing.price, listing.currency)}
        </p>

        <p className="text-xs text-gray-400 mb-3">
          {listing.city}
          {listing.district ? `, ${listing.district}` : ''}
          {' · '}
          {formatDate(listing.createdAt)}
        </p>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/listings/edit/${listing.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            تعديل
          </Link>
          {!isSold && (
            <button
              onClick={() => onMarkSold(listing.id)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isLoading ? 'جارٍ التحديث…' : 'تحديد كمباع'}
            </button>
          )}
          <button
            onClick={() => onDelete(listing)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            حذف الإعلان
          </button>
          {isActive && (
            <button
              onClick={() => onDoping(listing)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-sm hover:from-orange-600 hover:to-pink-600 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              تعزيز الإعلان
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyListingsPage() {
  const router             = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const PER_PAGE = 10;

  const [mounted,        setMounted]        = useState(false);
  const [listings,       setListings]       = useState<Listing[]>([]);
  const [page,           setPage]           = useState(1);
  const [totalPages,     setTotalPages]     = useState(1);
  const [total,          setTotal]          = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [actionLoading,  setActionLoading]  = useState<string | null>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<Listing | null>(null);
  const [deleteLoading,  setDeleteLoading]  = useState(false);
  const [dopingTarget,   setDopingTarget]   = useState<Listing | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Auth guard — only fires after Zustand has rehydrated
  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) router.replace('/login');
  }, [mounted, isAuthenticated, router]);

  // Load listings — paginated. Cancellable so rapid page changes don't race.
  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listingsService
      .getMyListingsPaged(page, PER_PAGE)
      .then((result) => {
        if (cancelled) return;
        setListings(result.listings);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[MyListings] fetch error:', err);
        setError('حدث خطأ أثناء تحميل إعلاناتك.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mounted, isAuthenticated, page]);

  async function handleMarkSold(id: string) {
    setActionLoading(id);
    try {
      await listingsService.markAsSold(id);
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: 'SOLD' } : l)),
      );
    } catch (err) {
      console.error('[MyListings] markAsSold error:', err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await listingsService.deleteListing(deleteTarget.id);
      setDeleteTarget(null);
      // If we just removed the last item on a page > 1, go back one page
      // (the useEffect dependency on `page` will refetch automatically).
      if (listings.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        setListings((prev) => prev.filter((l) => l.id !== deleteTarget.id));
        setTotal((t) => Math.max(0, t - 1));
      }
    } catch (err) {
      console.error('[MyListings] deleteListing error:', err);
    } finally {
      setDeleteLoading(false);
    }
  }

  // Show the skeleton while hydrating or redirecting — never a blank page
  if (!mounted || !isAuthenticated) {
    return (
      <div>
        <div className="h-8 w-48 bg-gray-200 rounded mb-6 animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-start bg-white rounded-2xl border border-gray-200 p-4 animate-pulse">
              <div className="w-28 h-20 rounded-xl bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-5 bg-gray-200 rounded w-1/4" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const name = user?.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user?.email ?? '';

  return (
    <>
      {deleteTarget && (
        <DeleteModal
          listing={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
      <DopingPurchaseModal
        isOpen={dopingTarget !== null}
        onClose={() => setDopingTarget(null)}
        listingId={dopingTarget?.id ?? ''}
        listingTitle={dopingTarget?.title ?? ''}
      />

      <div>

          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">إعلاناتي</h1>
              {name && <p className="text-sm text-gray-500 mt-0.5">{name}</p>}
            </div>
            <Link
              href="/listings/create"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              إعلان جديد
            </Link>
          </div>

          {/* Content */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4 items-start bg-white rounded-2xl border border-gray-200 p-4 animate-pulse">
                  <div className="w-28 h-20 rounded-xl bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-5 bg-gray-200 rounded w-1/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                    <div className="flex gap-2 pt-1">
                      <div className="h-7 bg-gray-200 rounded-lg w-36" />
                      <div className="h-7 bg-gray-200 rounded-lg w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <XCircle className="w-10 h-10 text-red-400" />
              <p className="text-gray-700 font-medium">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-orange-500 hover:text-orange-700 font-medium"
              >
                حاول مجدداً
              </button>
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center">
                <Tag className="w-8 h-8 text-orange-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-800 mb-1">ليس لديك أي إعلانات بعد</p>
                <p className="text-sm text-gray-500">انقر على الزر أدناه لنشر إعلانك الأول</p>
              </div>
              <Link
                href="/listings/create"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                أضف إعلان
              </Link>
            </div>
          ) : (
            <>
              {/* Stats row */}
              <div className="flex flex-wrap gap-3 mb-5">
                {['ACTIVE', 'PENDING', 'SOLD', 'REJECTED'].map((s) => {
                  const count = listings.filter((l) => l.status === s).length;
                  if (!count) return null;
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <div
                      key={s}
                      className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold', cfg.className)}
                    >
                      {cfg.icon}
                      {cfg.label}: {count}
                    </div>
                  );
                })}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-gray-500 text-xs font-semibold me-auto">
                  المجموع: {total}
                </div>
              </div>

              {/* Listing rows */}
              <div className="space-y-3">
                {listings.map((listing) => (
                  <ListingRow
                    key={listing.id}
                    listing={listing}
                    onMarkSold={handleMarkSold}
                    onDelete={setDeleteTarget}
                    onDoping={setDopingTarget}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    الصفحة <span className="font-semibold text-gray-800">{page}</span> / {totalPages}
                    <span className="ms-2 text-gray-400">({total} إعلان)</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                      السابق
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      التالي
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
      </div>
    </>
  );
}
