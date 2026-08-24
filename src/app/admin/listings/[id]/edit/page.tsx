'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ChevronRight, Save, Loader2, AlertCircle, ImageOff, MapPin, Pencil, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { listingsService } from '@/services/listings.service';
import { useAdminAuthStore } from '@/store/auth.store';
import { AdminNav } from '@/components/admin/AdminNav';
import { LISTING_STATUS_AR, UI_AR } from '@/lib/staff-labels';
import {
  toValidCoords,
  formatAddressLine,
  MAP_GOVERNORATE_ZOOM,
  zoomForRegionLevel,
  type Coords,
} from '@/lib/map';
import {
  LocationCascade,
  EMPTY_LOCATION,
  type LocationValue,
} from '@/components/listings/LocationCascade';
import type { Listing } from '@/types';

// Same lazy boundary as everywhere else — maplibre never enters a first load.
const ListingMapPicker = dynamic(() => import('@/components/listings/ListingMapPicker'), {
  ssr: false,
});

/**
 * Statuses this page may WRITE.
 *
 * PATCH /admin/listings/:id validates with the same `updateListingSchema` the owner
 * route uses, whose status enum is ACTIVE | SOLD. The wider moderation vocabulary
 * (approve / reject) stays on the listings table's own buttons, which call
 * PATCH /admin/listings/:id/status — that route also fires the seller's
 * approved/rejected notification, which a content edit must never do.
 */
const EDITABLE_STATUSES = ['ACTIVE', 'SOLD'] as const;
type EditableStatus = (typeof EDITABLE_STATUSES)[number];

// ── Skeleton ──────────────────────────────────────────────────────────────────

function EditSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
        <div className="h-6 w-40 bg-gray-200 rounded mb-8" />
        <div className="bg-white rounded-card shadow-pebble p-6 space-y-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
              <div className="bg-gray-200 rounded-xl w-full" style={{ height: i === 2 ? 96 : 40 }} />
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
        <h1 className="text-lg font-bold text-gray-900 mb-2">الإعلان غير موجود</h1>
        <p className="text-sm text-gray-500 mb-6">
          قد يكون هذا الإعلان محذوفاً، أو يعود إلى حساب موقوف أو محذوف.
        </p>
        <Link
          href="/admin/listings"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          <ChevronRight className="w-4 h-4" />
          العودة إلى إدارة الإعلانات
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminEditListingPage() {
  const params = useParams<{ id: string }>();
  const id     = params?.id as string;
  const router = useRouter();
  const { user: admin, isAuthenticated } = useAdminAuthStore();

  const [mounted,   setMounted]   = useState(false);
  const [listing,   setListing]   = useState<Listing | null>(null);
  const [fetching,  setFetching]  = useState(true);
  const [notFound,  setNotFound]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Controlled form fields
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [price,       setPrice]       = useState('');
  const [currency,    setCurrency]    = useState<'SYP' | 'USD'>('USD');
  // '' = leave the stored status alone (the only option for a PENDING_REVIEW /
  // REJECTED row, which this endpoint cannot move — see EDITABLE_STATUSES).
  const [status,      setStatus]      = useState<EditableStatus | ''>('');
  const [pin,         setPin]         = useState<Coords | null>(null);

  // Location editing is OPT-IN, exactly as on the seller's edit page: the read
  // payload carries only the denormalized text, never `regionSlug`, so there is
  // nothing to prefill the cascade with. Leaving it closed sends no `regionSlug`,
  // which the backend reads as "leave the location alone".
  const [editingLocation, setEditingLocation] = useState(false);
  const [location,        setLocation]        = useState<LocationValue>(EMPTY_LOCATION);

  useEffect(() => { setMounted(true); }, []);

  // Admin-realm auth guard — same shape as every other /admin page.
  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || admin?.userType !== 'ADMIN') {
      router.replace('/admin/login');
    }
  }, [mounted, isAuthenticated, admin, router]);

  // Fetch listing and populate the form. GET /listings/:id is softAuth and serves
  // every non-DELETED status, so it works for a PENDING_REVIEW row too — and being
  // on an /admin/* pathname, api.ts sends the ADMIN token with it.
  useEffect(() => {
    if (!mounted || !isAuthenticated || admin?.userType !== 'ADMIN' || !id) return;
    setFetching(true);
    listingsService
      .getListingById(id)
      .then((data) => {
        setListing(data);
        setTitle(data.title ?? '');
        setDescription(data.description ?? '');
        setPrice(data.price != null ? String(data.price) : '');
        setCurrency(data.currency ?? 'USD');
        setPin(toValidCoords(data.latitude, data.longitude));
      })
      .catch(() => setNotFound(true))
      .finally(() => setFetching(false));
  }, [mounted, isAuthenticated, admin, id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || saving) return;
    setSaveError(null);
    setSaving(true);
    try {
      await listingsService.adminUpdateListing(id, {
        title:       title.trim(),
        description: description.trim(),
        price:       Number(price),
        currency,
        // Only when the admin actually picked one — '' leaves the stored status.
        ...(status ? { status } : {}),
        // Both or neither: the schema has no null for these, so a pin can be
        // moved here but not erased.
        ...(pin ? { latitude: pin.lat, longitude: pin.lng } : {}),
        // Only sent when the location was reopened; omitting it leaves
        // regionId/city/governorate/neighborhood exactly as stored.
        ...(editingLocation && location.regionSlug
          ? {
              regionSlug: location.regionSlug,
              // Free text belongs to «أخرى» only — for a catalog pick the backend
              // overwrites `neighborhood` with the region's own name.
              ...(location.isOther && location.freeText.trim()
                ? { neighborhood: location.freeText.trim() }
                : {}),
            }
          : {}),
      });
      toast.success('تم حفظ التعديلات.');
      router.push('/admin/listings');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذّر حفظ التغييرات — حاول مجدداً.';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!mounted || !isAuthenticated || admin?.userType !== 'ADMIN') return null;
  if (fetching) return <EditSkeleton />;
  if (notFound || !listing) return <ListingNotFound />;

  const thumb = listing.images?.find((i) => i.isPrimary)?.url ?? listing.images?.[0]?.url;
  const currentStatus = listing.status ?? '';
  const statusLocked  = !(EDITABLE_STATUSES as readonly string[]).includes(currentStatus);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">تعديل الإعلان</h1>
            <p className="text-sm text-gray-500 truncate">{listing.title}</p>
          </div>
        </div>

        <AdminNav />

        <Link
          href="/admin/listings"
          className="inline-flex items-center gap-1 mb-5 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          <ChevronRight className="w-4 h-4" />
          العودة إلى إدارة الإعلانات
        </Link>

        {/* Listing identity strip */}
        <div className="flex items-center gap-3 bg-white shadow-pebble rounded-card px-4 py-3 mb-5">
          <div className="w-14 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
            {thumb
              ? <img src={thumb} alt="" className="w-full h-full object-cover" />
              : <ImageOff className="w-4 h-4 text-gray-300" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-800 truncate">{listing.title}</p>
            <p className="text-xs text-gray-400">
              {listing.listingNumber ? `رقم الإعلان ${listing.listingNumber} — ` : ''}
              {LISTING_STATUS_AR[currentStatus] ?? currentStatus ?? '—'}
            </p>
          </div>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-card shadow-pebble p-6 space-y-5">

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              عنوان الإعلان <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={5}
              maxLength={150}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[16px] focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">الوصف</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              minLength={20}
              maxLength={5000}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[16px] focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 transition resize-none"
            />
          </div>

          {/* Price + Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                السعر <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min="1"
                step="any"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[16px] focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">العملة</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'SYP' | 'USD')}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[16px] bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 transition"
              >
                <option value="USD">USD ($)</option>
                <option value="SYP">SYP (ل.س)</option>
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">الحالة</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EditableStatus | '')}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[16px] bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 transition"
            >
              <option value="">
                بلا تغيير — {LISTING_STATUS_AR[currentStatus] ?? currentStatus ?? '—'}
              </option>
              {EDITABLE_STATUSES.map((s) => (
                <option key={s} value={s}>{LISTING_STATUS_AR[s] ?? s}</option>
              ))}
            </select>
            {statusLocked && (
              <p className="mt-1.5 text-xs text-gray-500">
                الاعتماد والرفض يتمّان من أزرار الجدول في صفحة إدارة الإعلانات — هذه القائمة
                تنقل الإعلان بين «منشور» و«مُباع» فقط.
              </p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">الموقع</label>

            {!editingLocation ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <span className="flex min-w-0 items-center gap-2 text-sm text-gray-700">
                  <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="truncate">
                    {formatAddressLine({
                      neighborhood: listing.neighborhood,
                      district: listing.district,
                      city: listing.city,
                      governorate: listing.governorate,
                    }) || 'غير محدد'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setEditingLocation(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  تغيير
                </button>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                <LocationCascade value={location} onChange={setLocation} />
                <button
                  type="button"
                  onClick={() => {
                    setEditingLocation(false);
                    setLocation(EMPTY_LOCATION);
                  }}
                  className="text-xs font-semibold text-gray-500 underline-offset-2 hover:underline"
                >
                  إلغاء التغيير والإبقاء على الموقع الحالي
                </button>
              </div>
            )}
          </div>

          {/* Map pin */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              الموقع على الخريطة
            </label>
            <ListingMapPicker
              value={pin}
              onChange={setPin}
              governorate={listing.governorate ?? listing.city}
              center={location.center}
              centerZoom={
                location.isOther
                  ? MAP_GOVERNORATE_ZOOM
                  : zoomForRegionLevel(location.centerLevel)
              }
              allowClear={false}
              hint="انقر أو اسحب لتصحيح موقع الإعلان على الخريطة."
              className="h-[300px]"
            />
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
              href="/admin/listings"
              className="flex-1 flex items-center justify-center py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {UI_AR.cancel}
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" />{UI_AR.saving}</>
                : <><Save className="w-4 h-4" />حفظ التغييرات</>}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
