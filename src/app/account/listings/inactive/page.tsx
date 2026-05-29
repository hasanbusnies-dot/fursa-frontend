'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, ImageOff, CheckCircle2, Clock, XCircle, Tag,
  Trash2, AlertTriangle, Pencil, PlayCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { listingsService } from '@/services/listings.service';
import { useAuthStore } from '@/store/auth.store';
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
  SOLD: {
    label: 'مباع',
    icon: <Tag className="w-3.5 h-3.5" />,
    className: 'bg-gray-100 text-gray-500 border-gray-200',
  },
  PENDING: {
    label: 'قيد المراجعة',
    icon: <Clock className="w-3.5 h-3.5" />,
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  REJECTED: {
    label: 'مرفوض',
    icon: <XCircle className="w-3.5 h-3.5" />,
    className: 'bg-red-50 text-red-600 border-red-200',
  },
  INACTIVE: {
    label: 'غير نشط',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    className: 'bg-gray-100 text-gray-500 border-gray-200',
  },
  DRAFT: {
    label: 'مسودة',
    icon: <Pencil className="w-3.5 h-3.5" />,
    className: 'bg-gray-100 text-gray-500 border-gray-200',
  },
};

function StatusBadge({ status }: { status?: string }) {
  const cfg = STATUS_CONFIG[status ?? ''] ?? {
    label: 'غير نشط',
    icon: <Clock className="w-3.5 h-3.5" />,
    className: 'bg-gray-100 text-gray-500 border-gray-200',
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

const REACTIVATABLE = new Set(['REJECTED', 'INACTIVE', 'DRAFT', 'SOLD']);

function ListingRow({
  listing,
  onReactivate,
  onDelete,
  actionLoading,
}: {
  listing: Listing;
  onReactivate: (id: string) => void;
  onDelete: (listing: Listing) => void;
  actionLoading: string | null;
}) {
  const thumb     = listing.images?.find((i) => i.isPrimary)?.url ?? listing.images?.[0]?.url;
  const isLoading = actionLoading === listing.id;
  const canReactivate = REACTIVATABLE.has(listing.status ?? '');

  return (
    <div className="flex gap-4 items-start rounded-2xl border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow opacity-90">
      {/* Thumbnail */}
      <Link href={`/listings/${listing.id}`} className="shrink-0">
        <div className="w-20 h-16 sm:w-28 sm:h-20 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
          {thumb ? (
            <img src={thumb} alt={listing.title} className="w-full h-full object-cover grayscale" />
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
            className="text-sm font-semibold text-gray-700 hover:text-orange-600 transition-colors line-clamp-2 leading-snug"
          >
            {listing.title}
          </Link>
          <StatusBadge status={listing.status} />
        </div>

        <p className="text-gray-500 font-bold text-base mb-1">
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
          {canReactivate && (
            <button
              onClick={() => onReactivate(listing.id)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              {isLoading ? 'جارٍ التفعيل…' : 'تفعيل الإعلان'}
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
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InactiveListingsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [mounted,       setMounted]       = useState(false);
  const [listings,      setListings]      = useState<Listing[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<Listing | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
    listingsService
      .getMyListings()
      .then((all) => {
        if (cancelled) return;
        setListings(all.filter((l) => l.status !== 'ACTIVE'));
      })
      .catch(() => {
        if (cancelled) return;
        setError('حدث خطأ أثناء تحميل إعلاناتك.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mounted, isAuthenticated]);

  async function handleReactivate(id: string) {
    setActionLoading(id);
    try {
      await listingsService.reactivateListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
      toast.success('تم تفعيل الإعلان بنجاح');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذّر تفعيل الإعلان.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await listingsService.deleteListing(deleteTarget.id);
      setListings((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success('تم حذف الإعلان.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذّر حذف الإعلان.');
    } finally {
      setDeleteLoading(false);
    }
  }

  if (!mounted || !isAuthenticated) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
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

      <div>
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">إعلاناتي غير النشطة</h1>
            {name && <p className="text-sm text-gray-500 mt-0.5">{name}</p>}
          </div>
          <Link
            href="/listings/create"
            prefetch={false}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            إعلان جديد
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-start bg-white rounded-2xl border border-gray-200 p-4 animate-pulse">
                <div className="w-28 h-20 rounded-xl bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-5 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="flex gap-2 pt-1">
                    <div className="h-7 bg-gray-200 rounded-lg w-24" />
                    <div className="h-7 bg-gray-200 rounded-lg w-24" />
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
            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800 mb-1">جميع إعلاناتك نشطة!</p>
              <p className="text-sm text-gray-500">لا توجد إعلانات غير نشطة، قيد الانتظار أو مرفوضة.</p>
            </div>
            <Link
              href="/account/listings"
              className="text-sm font-semibold text-orange-500 hover:underline"
            >
              ← الذهاب إلى إعلاناتي النشطة
            </Link>
          </div>
        ) : (
          <>
            {/* Status summary */}
            <div className="flex flex-wrap gap-3 mb-5">
              {['PENDING', 'REJECTED', 'SOLD', 'INACTIVE', 'DRAFT'].map((s) => {
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
                المجموع: {listings.length}
              </div>
            </div>

            {/* Listing rows */}
            <div className="space-y-3">
              {listings.map((listing) => (
                <ListingRow
                  key={listing.id}
                  listing={listing}
                  onReactivate={handleReactivate}
                  onDelete={setDeleteTarget}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
