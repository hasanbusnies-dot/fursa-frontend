'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Check, X, Clock, ImageOff, Loader2, ShieldCheck, Inbox,
  Star, StarOff, Pencil, Trash2, AlertTriangle, Users, Building2,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { listingsService } from '@/services/listings.service';
import { categoriesService } from '@/services/categories.service';
import type { Category, Listing } from '@/types';
import { AdminNav } from '@/components/admin/AdminNav';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(price: number, currency: 'SYP' | 'USD') {
  const n = new Intl.NumberFormat('en-US').format(price);
  return currency === 'USD' ? `$${n}` : `${n} SYP`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60)  return `${mins}d önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}s önce`;
  return `${Math.floor(hrs / 24)}g önce`;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE:         { label: 'Aktif',        cls: 'bg-green-100 text-green-700' },
    PENDING_REVIEW: { label: 'İncelemede',   cls: 'bg-amber-100 text-amber-700' },
    PENDING:        { label: 'Bekliyor',     cls: 'bg-amber-100 text-amber-700' },
    REJECTED:       { label: 'Reddedildi',   cls: 'bg-red-100 text-red-600' },
    SOLD:           { label: 'Satıldı',      cls: 'bg-gray-100 text-gray-500' },
    INACTIVE:       { label: 'Pasif',        cls: 'bg-gray-100 text-gray-500' },
  };
  const s = map[status ?? ''] ?? { label: status ?? '—', cls: 'bg-gray-100 text-gray-500' };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ── Seller type badge ─────────────────────────────────────────────────────────

function SellerBadge({ fromWho }: { fromWho?: string }) {
  if (!fromWho) return null;
  const isDealer = fromWho === 'DEALER' || fromWho === 'GALERI';
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
      isDealer ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
    }`}>
      {isDealer ? <Building2 className="w-2.5 h-2.5" /> : <Users className="w-2.5 h-2.5" />}
      {isDealer ? 'Kurumsal' : 'Bireysel'}
    </span>
  );
}

// ── Tab definition ────────────────────────────────────────────────────────────

type TabId = 'all' | 'pending' | 'individual' | 'corporate';

interface TabDef {
  id: TabId;
  label: string;
  params: Parameters<typeof listingsService.getAdminListings>[0];
  // Client-side filter applied after the backend response (handles backends that
  // ignore fromWho on the admin endpoint).
  localFilter?: (l: Listing) => boolean;
}

const TABS: TabDef[] = [
  { id: 'all',      label: 'Tüm İlanlar',     params: {} },
  { id: 'pending',  label: 'Onay Bekleyenler', params: { status: 'PENDING_REVIEW' } },
  {
    id: 'individual', label: 'Bireysel İlanlar', params: {},
    localFilter: (l) => {
      const fw = (l.vehicleDetails?.fromWho ?? '').toUpperCase();
      return fw === 'OWNER' || fw === 'SAHIBINDEN' || fw === '';
    },
  },
  {
    id: 'corporate', label: 'Kurumsal İlanlar', params: {},
    localFilter: (l) => {
      const fw = (l.vehicleDetails?.fromWho ?? '').toUpperCase();
      return fw === 'DEALER' || fw === 'GALERI' || fw === 'GALERIDEN';
    },
  },
];

// ── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteModal({
  listing,
  onConfirm,
  onCancel,
  busy,
}: {
  listing: Listing;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">İlanı Sil</h3>
            <p className="text-sm text-gray-500 mt-0.5">Bu işlem geri alınamaz.</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 mb-6 line-clamp-2">
          {listing.title}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Sil
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gray-200 animate-pulse shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><div className="h-3 w-28 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-5 w-12 bg-gray-200 rounded-full animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-3 w-20 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-3 w-16 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5">
          {[1,2,3,4].map(i => <div key={i} className="h-7 w-16 bg-gray-200 rounded-lg animate-pulse" />)}
        </div>
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminListingsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [mounted,       setMounted]       = useState(false);
  const [activeTab,     setActiveTab]     = useState<TabId>('all');
  const [listings,      setListings]      = useState<Listing[]>([]);
  const [page,          setPage]          = useState(1);
  const [meta,          setMeta]          = useState<{ page: number; totalPages: number } | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [deleteTarget,  setDeleteTarget]  = useState<Listing | null>(null);
  const [deleteBusy,    setDeleteBusy]    = useState(false);

  // Category filter state
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [mainCatId,   setMainCatId]   = useState('');
  const [subCatId,    setSubCatId]    = useState('');

  useEffect(() => { setMounted(true); }, []);

  // Auth guard
  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || user?.userType !== 'ADMIN') {
      router.replace('/admin/login');
    }
  }, [mounted, isAuthenticated, user, router]);

  // Fetch category tree once after auth is confirmed
  useEffect(() => {
    if (!mounted || !isAuthenticated || user?.userType !== 'ADMIN') return;
    categoriesService.getTree().then(setCategories).catch(() => {});
  }, [mounted, isAuthenticated, user]);

  // Reset page when tab or category filter changes
  useEffect(() => { setPage(1); }, [activeTab, mainCatId, subCatId]);

  // Clear sub-category when main category changes
  useEffect(() => { setSubCatId(''); }, [mainCatId]);

  // Deepest selected category id (sub takes priority over main)
  const selectedCategoryId = subCatId || mainCatId || undefined;

  // Fetch on tab, page, or category change
  useEffect(() => {
    if (!mounted || !isAuthenticated || user?.userType !== 'ADMIN') return;

    let cancelled = false;
    setLoading(true);
    setListings([]);

    const tab = TABS.find((t) => t.id === activeTab)!;
    listingsService
      .getAdminListings({ limit: 50, page, categoryId: selectedCategoryId, ...tab.params })
      .then((r) => {
        if (cancelled) return;
        const rows = tab.localFilter ? r.listings.filter(tab.localFilter) : r.listings;
        setListings(rows);
        setMeta({ page: r.page, totalPages: r.totalPages });
      })
      .catch(() => { if (!cancelled) toast.error('İlanlar yüklenemedi.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mounted, isAuthenticated, user, activeTab, page, selectedCategoryId]);

  // ── Action helpers ─────────────────────────────────────────────────────────

  const setBusy = (id: string) =>
    setProcessingIds((prev) => new Set(prev).add(id));
  const clearBusy = (id: string) =>
    setProcessingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });

  const handleApproveReject = async (id: string, status: 'ACTIVE' | 'REJECTED') => {
    setBusy(id);
    try {
      await listingsService.updateListingStatus(id, status);
      setListings((prev) => prev.filter((l) => l.id !== id));
      toast.success(status === 'ACTIVE' ? 'İlan onaylandı.' : 'İlan reddedildi.');
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      clearBusy(id);
    }
  };

  const handleToggleFeatured = async (listing: Listing) => {
    const next = !listing.isFeatured;
    setBusy(listing.id);
    try {
      await listingsService.toggleFeatured(listing.id, next);
      setListings((prev) =>
        prev.map((l) => l.id === listing.id ? { ...l, isFeatured: next } : l)
      );
      toast.success(next ? 'Vitrine eklendi.' : 'Vitrinden kaldırıldı.');
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      clearBusy(listing.id);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await listingsService.deleteListing(deleteTarget.id);
      setListings((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      toast.success('İlan silindi.');
      setDeleteTarget(null);
    } catch {
      toast.error('Silme işlemi başarısız.');
    } finally {
      setDeleteBusy(false);
    }
  };

  // ── Auth guard render ──────────────────────────────────────────────────────

  if (!mounted) return null;
  if (!isAuthenticated || user?.userType !== 'ADMIN') return null;

  const currentTab = TABS.find((t) => t.id === activeTab)!;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {deleteTarget && (
        <DeleteModal
          listing={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleteBusy}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">İlan Yönetimi</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? 'Yükleniyor…' : `${listings.length} ilan — ${currentTab.label}`}
            </p>
          </div>
        </div>

        {/* Admin nav */}
        <AdminNav />

        {/* ── Category filter ───────────────────────────────────────────────── */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
            {/* Main category */}
            <div className="flex items-center gap-2 min-w-0">
              <label className="text-xs font-semibold text-gray-500 whitespace-nowrap shrink-0">
                Ana Kategori
              </label>
              <select
                value={mainCatId}
                onChange={(e) => setMainCatId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition min-w-[160px]"
              >
                <option value="">Tümü</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Sub-category — only when main has children */}
            {mainCatId && (categories.find((c) => c.id === mainCatId)?.children ?? []).length > 0 && (
              <div className="flex items-center gap-2 min-w-0">
                <label className="text-xs font-semibold text-gray-500 whitespace-nowrap shrink-0">
                  Alt Kategori
                </label>
                <select
                  value={subCatId}
                  onChange={(e) => setSubCatId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition min-w-[160px]"
                >
                  <option value="">Tümü</option>
                  {(categories.find((c) => c.id === mainCatId)?.children ?? []).map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Active indicator chip */}
            {selectedCategoryId && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                {subCatId
                  ? categories.find((c) => c.id === mainCatId)?.children?.find((s) => s.id === subCatId)?.name
                  : categories.find((c) => c.id === mainCatId)?.name}
              </span>
            )}

            {/* Clear */}
            {selectedCategoryId && (
              <button
                onClick={() => { setMainCatId(''); setSubCatId(''); }}
                className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200 transition-colors"
              >
                <X className="w-3 h-3" />
                Filtreyi Temizle
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">İlan</th>
                  <th className="px-4 py-3 text-left">Satıcı</th>
                  <th className="px-4 py-3 text-left">Durum</th>
                  <th className="px-4 py-3 text-left">Vitrin</th>
                  <th className="px-4 py-3 text-left">Fiyat</th>
                  <th className="px-4 py-3 text-left">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Tarih</span>
                  </th>
                  <th className="px-4 py-3 text-left">İşlemler</th>
                </tr>
              </thead>

              <tbody>
                {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

                {!loading && listings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <Inbox className="w-10 h-10" />
                        <p className="font-medium text-gray-600">Hiç ilan yok</p>
                        <p className="text-sm">Bu sekme için görüntülenecek ilan bulunamadı.</p>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && listings.map((listing) => {
                  const primary = listing.images?.find((i) => i.isPrimary) ?? listing.images?.[0];
                  const isBusy  = processingIds.has(listing.id);
                  const sellerName = listing.user?.profile
                    ? `${listing.user.profile.firstName} ${listing.user.profile.lastName}`
                    : listing.user?.email ?? '—';
                  const fromWho = listing.vehicleDetails?.fromWho;

                  return (
                    <tr
                      key={listing.id}
                      className={`border-b last:border-0 transition-colors ${
                        listing.status === 'PENDING_REVIEW' || listing.status === 'PENDING'
                          ? 'border-amber-100 bg-amber-50/40 hover:bg-amber-50/70'
                          : 'border-gray-100 hover:bg-gray-50/60'
                      }`}
                    >
                      {/* Thumbnail + title + category */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                            {primary?.url ? (
                              <img src={primary.url} alt={listing.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageOff className="w-4 h-4 text-gray-300" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 line-clamp-1 max-w-[200px]">
                              {listing.title}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {listing.category?.name ?? 'Kategorisiz'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Seller name + type */}
                      <td className="px-4 py-3">
                        <p className="text-gray-700 text-xs font-medium truncate max-w-[140px]">{sellerName}</p>
                        <div className="mt-1"><SellerBadge fromWho={fromWho} /></div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={listing.status} />
                      </td>

                      {/* Featured badge */}
                      <td className="px-4 py-3">
                        {listing.isFeatured && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
                            <Star className="w-2.5 h-2.5 fill-amber-700" />
                            Vitrin
                          </span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 font-semibold text-blue-600 whitespace-nowrap text-xs">
                        {formatPrice(listing.price, listing.currency)}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {timeAgo(listing.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">

                          {/* Edit */}
                          <Link
                            href={`/listings/edit/${listing.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 font-medium transition-colors text-xs"
                          >
                            <Pencil className="w-3 h-3" />
                            Düzenle
                          </Link>

                          {/* Toggle featured */}
                          <button
                            onClick={() => handleToggleFeatured(listing)}
                            disabled={isBusy}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed border ${
                              listing.isFeatured
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {isBusy
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : listing.isFeatured
                                ? <StarOff className="w-3 h-3" />
                                : <Star className="w-3 h-3" />}
                            {listing.isFeatured ? 'Kaldır' : 'Vitrin'}
                          </button>

                          {/* Approve / Reject — only for pending review */}
                          {(listing.status === 'PENDING_REVIEW' || listing.status === 'PENDING') && (
                            <>
                              <button
                                onClick={() => handleApproveReject(listing.id, 'ACTIVE')}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 font-semibold transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                              >
                                {isBusy
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <Check className="w-3 h-3" />}
                                Onayla
                              </button>
                              <button
                                onClick={() => handleApproveReject(listing.id, 'REJECTED')}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                              >
                                {isBusy
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <X className="w-3 h-3" />}
                                Reddet
                              </button>
                            </>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTarget(listing)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-medium transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3 h-3" />
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINATION CONTROLS */}
        {meta && meta.totalPages > 1 && (
          <div className="flex justify-center items-center space-x-4 py-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors"
            >
              Önceki
            </button>
            <span className="text-gray-600 font-medium">
              Sayfa {page} / {meta.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
              Sonraki
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
