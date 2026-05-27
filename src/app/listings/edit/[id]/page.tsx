'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, AlertCircle, ImageOff } from 'lucide-react';
import { listingsService } from '@/services/listings.service';
import { useAuthStore } from '@/store/auth.store';
import type { Listing } from '@/types';

// ── Skeleton ──────────────────────────────────────────────────────────────────

function EditSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
        <div className="h-6 w-40 bg-gray-200 rounded mb-8" />
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          {[80, 60, 100, 40].map((w, i) => (
            <div key={i}>
              <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
              <div className={`h-10 bg-gray-200 rounded-xl w-full`} style={{ height: i === 2 ? 96 : 40 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Not found ─────────────────────────────────────────────────────────────────

function ListingNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ImageOff className="w-7 h-7 text-gray-400" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">İlan Bulunamadı</h1>
        <p className="text-sm text-gray-500 mb-6">Bu ilan mevcut değil veya erişim yetkiniz yok.</p>
        <Link
          href="/account/listings"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          İlanlarıma Dön
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditListingPage() {
  const params           = useParams();
  const id               = params.id as string;
  const router           = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [mounted,    setMounted]    = useState(false);
  const [listing,    setListing]    = useState<Listing | null>(null);
  const [fetching,   setFetching]   = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState<string | null>(null);
  const [saved,      setSaved]      = useState(false);

  // Controlled form fields
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [price,       setPrice]       = useState('');
  const [currency,    setCurrency]    = useState<'SYP' | 'USD'>('USD');

  useEffect(() => { setMounted(true); }, []);

  // Auth guard — after hydration only
  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) router.replace('/login');
  }, [mounted, isAuthenticated, router]);

  // Fetch listing and populate form
  useEffect(() => {
    if (!mounted || !isAuthenticated || !id) return;
    setFetching(true);
    listingsService
      .getListingById(id)
      .then((data) => {
        setListing(data);
        setTitle(data.title ?? '');
        setDescription(data.description ?? '');
        setPrice(data.price != null ? String(data.price) : '');
        setCurrency(data.currency ?? 'USD');
      })
      .catch(() => setNotFound(true))
      .finally(() => setFetching(false));
  }, [mounted, isAuthenticated, id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || saving) return;
    setSaveError(null);
    setSaving(true);
    try {
      await listingsService.updateListing(id, {
        title:       title.trim(),
        description: description.trim(),
        price:       Number(price),
        currency,
      });
      setSaved(true);
      router.push('/account/listings');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Güncelleme başarısız oldu.';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!mounted || !isAuthenticated) return <EditSkeleton />;
  if (fetching) return <EditSkeleton />;
  if (notFound || !listing) return <ListingNotFound />;

  const thumb = listing.images?.find((i) => i.isPrimary)?.url ?? listing.images?.[0]?.url;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/account/listings"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">İlanı Düzenle</h1>
            <p className="text-sm text-gray-500 truncate">{listing.title}</p>
          </div>
        </div>

        {/* Listing preview strip */}
        {thumb && (
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-5">
            <div className="w-14 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
              <img src={thumb} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{listing.title}</p>
              <p className="text-xs text-gray-400">{listing.city}</p>
            </div>
          </div>
        )}

        {/* Edit form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              İlan Başlığı <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Açıklama
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 transition resize-none"
            />
          </div>

          {/* Price + Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Fiyat <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min="0"
                step="any"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Para Birimi
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'SYP' | 'USD')}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 transition"
              >
                <option value="USD">USD ($)</option>
                <option value="SYP">SYP (ل.س)</option>
              </select>
            </div>
          </div>

          {/* Error message */}
          {saveError && (
            <div className="flex items-start gap-2.5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Link
              href="/account/listings"
              className="flex-1 flex items-center justify-center py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={saving || saved}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Kaydediliyor…</>
              ) : saved ? (
                <><Save className="w-4 h-4" />Kaydedildi</>
              ) : (
                <><Save className="w-4 h-4" />Değişiklikleri Kaydet</>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
