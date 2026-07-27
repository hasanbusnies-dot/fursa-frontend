'use client';

import type { UseFormReturn } from 'react-hook-form';
import dynamic from 'next/dynamic';
import { AlertCircle, DollarSign } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { WizardFormData } from './schema';
import { toValidCoords, MAP_GOVERNORATE_ZOOM, MAP_PLACE_ZOOM, type Coords } from '@/lib/map';
import {
  LocationCascade,
  EMPTY_LOCATION,
  type LocationValue,
} from '@/components/listings/LocationCascade';
import { locationsService } from '@/services/locations.service';

// maplibre stays out of the wizard's first load: same lazy boundary as the
// read-only map on the detail page, and both share one chunk via the base hook.
const ListingMapPicker = dynamic(() => import('@/components/listings/ListingMapPicker'), {
  ssr: false,
});

interface Props { form: UseFormReturn<WizardFormData, any, WizardFormData> }

const inputCls = (err?: string) =>
  `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 transition-colors ${
    err
      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
  }`;

function Field({ label, error, required, children, hint }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

export function Step2AdDetails({ form }: Props) {
  const { register, setValue, watch, formState: { errors } } = form;
  const currency      = watch('currency');
  const description   = watch('description') ?? '';
  const acceptsOffers = watch('acceptsOffers') ?? true;

  // The map pin lives in RHF like the acceptsOffers switch does — via
  // watch + setValue, since the picker isn't a native input to register().
  const governorate = watch('city');
  const regionSlug  = watch('regionSlug');
  const latitude    = watch('latitude');
  const longitude   = watch('longitude');
  const hideMap     = watch('hideMap') ?? false;
  const pin = toValidCoords(latitude, longitude);

  /**
   * The cascade's own shape (selected slugs + the camera target) lives here, not
   * in RHF: it holds view state the payload has no field for, and RHF only needs
   * the three values that get submitted.
   *
   * This step UNMOUNTS when the seller moves to step 3, so the cascade has to be
   * rebuilt from the form on the way back. `regionSlug` is the only durable
   * anchor — `getPath` turns it back into a governorate + centre.
   */
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);
  const [rehydrated, setRehydrated] = useState(false);

  useEffect(() => {
    if (rehydrated) return;
    if (!regionSlug) {
      setRehydrated(true);
      return;
    }
    let alive = true;
    (async () => {
      const [path, region] = await Promise.all([
        locationsService.getPath(regionSlug),
        locationsService.getRegion(regionSlug),
      ]);
      if (!alive) return;
      const gov = path.find((p) => p.level === 'GOVERNORATE') ?? null;
      // regionSlug === the governorate itself ⇒ this was an «أخرى» pick, and the
      // seller's text is sitting in `neighborhood`.
      const isOther = !!gov && gov.slug === regionSlug;
      setLocation({
        regionSlug,
        isOther,
        freeText: isOther ? (form.getValues('neighborhood') ?? '') : '',
        governorateSlug: gov?.slug ?? null,
        governorateName: gov?.nameAr ?? governorate ?? null,
        center:
          region && region.lat != null && region.lng != null
            ? { lat: region.lat, lng: region.lng }
            : null,
      });
      setRehydrated(true);
    })();
    return () => { alive = false; };
  }, [regionSlug, rehydrated, governorate, form]);

  /**
   * Cascade → RHF. `city` keeps holding the GOVERNORATE name: it is what the
   * column has always held and it is NOT NULL on the backend, so it must be
   * written even though `regionSlug` is now the source of truth.
   *
   * `neighborhood` is only sent for «أخرى» — for a catalog pick the backend
   * overwrites it with the region's own name, so posting anything else would be
   * a value that silently loses.
   */
  const onLocationChange = useCallback(
    (next: LocationValue) => {
      setLocation(next);
      setValue('regionSlug', next.regionSlug ?? undefined, { shouldDirty: true });
      setValue('city', next.governorateName ?? '', { shouldDirty: true, shouldValidate: true });
      setValue('neighborhood', next.isOther ? next.freeText || undefined : undefined, {
        shouldDirty: true,
      });
    },
    [setValue],
  );

  // Governorate → district → place, each narrowing the camera.
  const mapZoom = location.regionSlug && !location.isOther
    ? MAP_PLACE_ZOOM
    : MAP_GOVERNORATE_ZOOM;

  const setPin = (next: Coords | null) => {
    // Cleared pins go back to undefined, never 0 — a real 0,0 would be a
    // coordinate in the Gulf of Guinea, and `toValidCoords` rejects it anyway.
    setValue('latitude',  next ? next.lat : undefined, { shouldDirty: true });
    setValue('longitude', next ? next.lng : undefined, { shouldDirty: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">تفاصيل الإعلان والموقع</h2>
        <p className="text-sm text-gray-500 mt-1">اكتب نص إعلانك وحدد السعر والموقع.</p>
      </div>

      {/* ── Title ── */}
      <Field
        label="عنوان الإعلان"
        required
        error={errors.title?.message}
        hint="كن محدداً — مثال: 'تويوتا كامري 2019 موديل 2.5 SE — حالة ممتازة'"
      >
        <input
          {...register('title')}
          placeholder="أدخل عنواناً واضحاً ووصفياً"
          className={inputCls(errors.title?.message)}
        />
      </Field>

      {/* ── Description ── */}
      <Field label="الوصف" required error={errors.description?.message}>
        <div className="relative">
          <textarea
            {...register('description')}
            rows={5}
            placeholder="صف المركبة بالتفصيل — التاريخ، الإضافات، سبب البيع…"
            className={`${inputCls(errors.description?.message)} resize-none`}
          />
          <span className={`absolute bottom-2 end-3 text-[10px] ${description.length > 1900 ? 'text-red-400' : 'text-gray-300'}`}>
            {description.length}/2000
          </span>
        </div>
      </Field>

      {/* ── Price + Currency ── */}
      <div>
        <p className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          السعر <span className="text-red-500">*</span>
        </p>
        <div className="flex gap-2">
          {/* Currency toggle */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden shrink-0">
            {(['SYP', 'USD'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setValue('currency', c, { shouldValidate: true })}
                className={`px-4 py-2.5 text-sm font-semibold transition-colors ${
                  currency === c
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {c === 'USD' ? '$' : 'ل.س'}
              </button>
            ))}
          </div>
          {/* Price input */}
          <div className="relative flex-1">
            {currency === 'USD' && (
              <DollarSign className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            )}
            <input
              {...register('price', { valueAsNumber: true })}
              type="number"
              placeholder={currency === 'USD' ? '0.00' : '0'}
              min="0"
              step={currency === 'USD' ? '0.01' : '1'}
              // A focused number input treats a mouse-wheel scroll as a spinner
              // step, silently knocking the price down/up by one `step` (e.g.
              // 200000 → 199999, or 45000 → 44999.99 in USD). Blur on wheel so
              // scrolling the page never mutates the typed amount.
              onWheel={(e) => e.currentTarget.blur()}
              className={`${inputCls(errors.price?.message)} ${currency === 'USD' ? 'ps-9' : ''}`}
            />
          </div>
        </div>
        {errors.price && (
          <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />{errors.price.message}
          </p>
        )}
        {errors.currency && (
          <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />{errors.currency.message}
          </p>
        )}
      </div>

      {/* ── Accepts Offers toggle ── */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800">السماح بتقديم العروض</p>
          <p className="text-xs text-gray-400 mt-0.5">السماح للمشترين بتقديم عروض أسعار على إعلانك.</p>
        </div>
        {/* dir=ltr so the knob slides left→right regardless of page RTL */}
        <div dir="ltr" className="shrink-0 ms-4">
          <button
            type="button"
            role="switch"
            aria-checked={acceptsOffers}
            onClick={() => setValue('acceptsOffers', !acceptsOffers, { shouldDirty: true })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              acceptsOffers ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                acceptsOffers ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* ── Location ── */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-4">الموقع</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="الدولة" required error={errors.country?.message}>
            <input
              {...register('country')}
              placeholder="سوريا"
              className={inputCls(errors.country?.message)}
            />
          </Field>
        </div>

        {/* Governorate → [district] → place. The district step appears only for
            governorates whose places are actually spread across several of them;
            for a single-district governorate (دمشق) it would be a dead
            one-option select, so the cascade skips it. See LocationCascade. */}
        <div className="mt-4">
          <LocationCascade
            value={location}
            onChange={onLocationChange}
            governorateError={errors.city?.message}
          />
        </div>

        {/* Street line — optional free text. The detail page already renders it
            under the address line when present. */}
        <div className="mt-4">
          <Field
            label="العنوان"
            error={errors.address?.message}
            hint="اختياري — اسم الشارع أو علامة مميزة قريبة."
          >
            <input
              {...register('address')}
              placeholder="مثال: شارع الثورة، مقابل الصيدلية"
              className={inputCls(errors.address?.message)}
            />
          </Field>
        </div>

        {/* Map pin — below the address fields, refining what was typed above. */}
        <div className="mt-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            الموقع على الخريطة
          </label>

          {hideMap ? (
            <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
              لن تظهر أي خريطة في إعلانك. يمكنك إعادة تفعيلها في أي وقت من الزر أدناه.
            </p>
          ) : (
            <ListingMapPicker
              value={pin}
              onChange={setPin}
              governorate={governorate}
              center={location.center}
              centerZoom={mapZoom}
            />
          )}

          {/* Opt-out. Without a pin the detail page shows an APPROXIMATE circle
              over the governorate (derived at render time, never stored); this
              switch turns that off too, for sellers who want no map at all. */}
          <div className="mt-3 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800">إخفاء الخريطة من إعلاني</p>
              <p className="text-xs text-gray-400 mt-0.5">
                لن تُعرض أي خريطة — لا الموقع الدقيق ولا المنطقة التقريبية.
              </p>
            </div>
            {/* dir=ltr so the knob slides left→right regardless of page RTL */}
            <div dir="ltr" className="shrink-0 ms-4">
              <button
                type="button"
                role="switch"
                aria-checked={hideMap}
                onClick={() => {
                  const next = !hideMap;
                  setValue('hideMap', next, { shouldDirty: true });
                  // Hiding the map discards any pin: keeping a hidden coordinate
                  // would store a location the seller asked us not to show.
                  if (next) setPin(null);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  hideMap ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    hideMap ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
