'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { listingsService, type CreateListingPayload } from '@/services/listings.service';
import { ApiError } from '@/services/api';
import { useAuth } from '@/hooks/use-auth';
import { useStoreGate } from '@/store/store-gate.store';
import { StoreGateBlock } from '@/components/account/StoreGateNotice';
import { toValidCoords, HIDE_MAP_ATTR_KEY } from '@/lib/map';
import { StepIndicator } from './StepIndicator';
import {
  Step0Catalog,
  initialCatalogState,
  catalogStepIncomplete,
  type CatalogState,
} from './wizard/Step0Catalog';
import { Step1VehicleInfo } from './wizard/Step1VehicleInfo';
import { Step2AdDetails }   from './wizard/Step2AdDetails';
import { Step3DamageReport } from './wizard/Step3DamageReport';
import { Step4TechSpecs }   from './wizard/Step4TechSpecs';
import { Step5Photos }        from './wizard/Step5Photos';
import { Step6ContactInfo }  from './wizard/Step6ContactInfo';
import { Step6Review }       from './wizard/Step6Review';
import {
  wizardSchema,
  getDefaultDamageReport,
  SVG_PANELS,
  type WizardFormData,
  type DamageReportState,
} from './wizard/schema';

type SubmitPhase = 'idle' | 'uploading' | 'creating';

// Backward-compat re-export so existing DetailsStep.tsx import doesn't break
export type ListingFormData = WizardFormData;

// A wizard step. `trigger` lists the RHF fields validated before advancing; `customNav`
// marks the review step which renders its own submit button.
interface StepDef {
  key: string;
  label: string;
  trigger?: (keyof WizardFormData)[];
  node: React.ReactNode;
  customNav?: boolean;
}

export interface CreateListingFormProps {
  /** Submit handler. Defaults to the regular POST /listings. The agent store flow
   *  passes a store-scoped create (POST /agent/stores/:id/listings). May throw an
   *  Error whose message is surfaced to the user. */
  createListing?: (payload: CreateListingPayload) => Promise<unknown>;
  /** Called after a successful create. Defaults to navigating home. */
  onSuccess?: () => void;
  /** Success toast text. */
  successMessage?: string;
}

export function CreateListingForm({
  createListing,
  onSuccess,
  successMessage = 'تم إرسال إعلانك للمراجعة بنجاح!',
}: CreateListingFormProps = {}) {
  const router = useRouter();
  const submitListing = createListing ?? listingsService.create;
  const { isAuthenticated } = useAuth();
  const gate = useStoreGate();
  const [stepIdx, setStepIdx] = useState(0);

  // ── Client-side auth guard ───────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent('/listings/create')}`);
    }
  }, [mounted, isAuthenticated, router]);

  // ── Business-approval guard ──────────────────────────────────────────────
  // THE chokepoint for the add-listing lock. Every entry point (header CTA, bottom
  // nav, in-account empty states, a typed URL) converges on this route, so blocking
  // here covers all of them — the styled-off buttons elsewhere are courtesy only.
  // The backend refuses too (assertStoreApproved in listing.service.create).

  // ── React-Hook-Form (all scalar fields) ───────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<WizardFormData, any, WizardFormData>({
    resolver: zodResolver(wizardSchema) as any,
    defaultValues: {
      currency:        'SYP',
      categoryId:      '',
      categoryKind:    'GENERIC',
      condition:       'USED',
      heavyDamage:     false,
      country:         'سوريا',
      technicalSpecs:  [],
      showPhoneNumber: true,
      acceptsOffers:   true,
    },
  });
  const { setValue } = form;

  // ── Out-of-RHF state ─────────────────────────────────────────────────────
  const [catalog, setCatalog]           = useState<CatalogState>(initialCatalogState);
  const [damageReport, setDamageReport] = useState<DamageReportState>(getDefaultDamageReport);
  const [photos, setPhotos]             = useState<File[]>([]);
  const [submitPhase, setSubmitPhase]   = useState<SubmitPhase>('idle');

  const isSubmitting = submitPhase !== 'idle';

  // Catalog brand/model nodes (vehicle path) → canonical make/model.
  const brandNode = catalog.picked.find((p) => p.type === 'BRAND');
  const modelNode = catalog.picked.find((p) => p.type === 'MODEL');

  // ── Sync catalog selection → RHF (categoryId, kind, make/model) ────────────
  useEffect(() => {
    setValue('categoryId', catalog.categoryId ?? '', { shouldValidate: false });
    setValue('categoryKind', catalog.isVehicle ? 'VEHICLE' : 'GENERIC', { shouldValidate: false });
    if (catalog.isVehicle) {
      setValue('make',  brandNode?.name ?? '', { shouldValidate: false });
      setValue('model', modelNode?.name ?? '', { shouldValidate: false });
    } else {
      setValue('make',  '', { shouldValidate: false });
      setValue('model', '', { shouldValidate: false });
    }
  }, [catalog.categoryId, catalog.isVehicle, brandNode?.name, modelNode?.name, setValue]);

  // ── Step list (depends on whether the chosen category is a vehicle) ────────
  const steps: StepDef[] = [
    {
      key: 'catalog',
      label: 'الفئة',
      node: <Step0Catalog state={catalog} onChange={setCatalog} />,
    },
    ...(catalog.isVehicle ? [{
      key: 'vehicle',
      label: 'معلومات المركبة',
      trigger: ['condition', 'year'] as (keyof WizardFormData)[],
      node: (
        <Step1VehicleInfo
          form={form}
          lockedMakeModel={{ make: brandNode?.name ?? '', model: modelNode?.name ?? '' }}
        />
      ),
    }] : []),
    {
      key: 'details',
      label: 'تفاصيل الإعلان',
      trigger: ['title', 'description', 'price', 'currency', 'country', 'city'],
      node: <Step2AdDetails form={form} />,
    },
    ...(catalog.isVehicle ? [
      { key: 'damage', label: 'تقرير الأضرار',
        node: <Step3DamageReport damageReport={damageReport} onChange={setDamageReport} /> },
      { key: 'specs',  label: 'المواصفات الفنية',
        node: <Step4TechSpecs form={form} /> },
    ] : []),
    { key: 'photos',  label: 'الصور',
      node: <Step5Photos photos={photos} onChange={setPhotos} /> },
    { key: 'contact', label: 'معلومات التواصل',
      node: <Step6ContactInfo form={form} /> },
    {
      key: 'review', label: 'مراجعة', customNav: true,
      node: (
        <Step6Review
          form={form}
          catalog={catalog}
          damageReport={damageReport}
          photos={photos}
          isSubmitting={isSubmitting}
          submitPhase={submitPhase}
          onSubmit={handlePublish}
        />
      ),
    },
  ];

  const totalSteps = steps.length;
  // Clamp in case the step list shrank (vehicle → generic) while on a later step.
  const safeIdx = Math.min(stepIdx, totalSteps - 1);
  const current = steps[safeIdx];

  // ── Navigation ─────────────────────────────────────────────────────────────
  async function handleNext() {
    if (current.key === 'catalog' && catalogStepIncomplete(catalog)) {
      toast.error('يرجى إكمال اختيار الفئة وتعبئة الحقول المطلوبة.');
      return;
    }
    if (current.trigger && !(await form.trigger(current.trigger))) {
      toast.error('يرجى تصحيح الأخطاء المحددة قبل المتابعة.');
      return;
    }
    setStepIdx(Math.min(safeIdx + 1, totalSteps - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleBack() {
    setStepIdx(Math.max(0, safeIdx - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handlePublish() {
    if (catalogStepIncomplete(catalog)) {
      toast.error('يرجى إكمال اختيار الفئة وتعبئة الحقول المطلوبة.');
      setStepIdx(0);
      return;
    }
    const valid = await form.trigger();
    if (!valid) {
      toast.error('بعض الحقول المطلوبة غير مكتملة. يرجى مراجعة النموذج.');
      return;
    }

    const data = form.getValues();
    const isVehicle = catalog.isVehicle;
    // Optional map pin. Validated here rather than trusted from form state so a
    // partially-set pair can't be published as a coordinate.
    const pinCoords = toValidCoords(data.latitude, data.longitude);

    try {
      // Upload photos → get CDN URLs
      let imagePayload: Array<{ url: string; sortOrder: number; isPrimary: boolean }> = [];
      if (photos.length > 0) {
        setSubmitPhase('uploading');
        const urls = await listingsService.uploadImages(photos);
        imagePayload = urls.map((url, i) => ({ url, sortOrder: i, isPrimary: i === 0 }));
      }

      // Build damage report payload (only non-original panels) — vehicle path only.
      const damagePayload = Object.fromEntries(
        SVG_PANELS
          .filter((p) => (damageReport[p.key]?.status ?? 'ORIGINAL') !== 'ORIGINAL')
          .map((p) => {
            const s = damageReport[p.key]!;
            return [p.key, { status: s.status, ...(s.detail ? { detail: s.detail } : {}) }];
          }),
      );

      // Vehicle write-through — make/model come from the catalog brand/model selection.
      const vehicleDetails = isVehicle ? {
        make:           data.make           || undefined,
        series:         data.series         || undefined,
        model:          data.model          || undefined,
        year:           data.year           ?? undefined,
        mileage:        data.mileage        ?? undefined,
        seats:          data.seats          ?? undefined,
        color:          data.color          || undefined,
        condition:      data.condition,
        heavyDamage:    data.heavyDamage,
        fuelType:       data.fuelType       || undefined,
        transmission:   data.transmission   || undefined,
        bodyType:       data.bodyType       || undefined,
        enginePower:    data.enginePower    ?? undefined,
        engineCapacity: data.engineCapacity ?? undefined,
        drivetrain:     data.drivetrain     || undefined,
        gearCount:      data.gearCount      ?? undefined,
        warranty:       data.warranty       ?? undefined,
        tradeIn:        data.tradeIn        ?? undefined,
        fromWho:        data.fromWho        || undefined,
        damageReport:   Object.keys(damagePayload).length > 0 ? damagePayload : undefined,
        technicalSpecs: data.technicalSpecs?.length ? data.technicalSpecs : undefined,
      } : undefined;

      // Category-specific attributes (generic categories) → Listing.attributes JSONB.
      // The map opt-out rides along under an underscore key, by the same
      // convention the backend seeder uses for `_seed` — the detail page's spec
      // table skips every `_`-prefixed key, so it never shows up as a row.
      const mergedAttributes: Record<string, unknown> = {
        ...catalog.attributes,
        ...(data.hideMap ? { [HIDE_MAP_ATTR_KEY]: true } : {}),
      };
      const attributes = Object.keys(mergedAttributes).length ? mergedAttributes : undefined;

      setSubmitPhase('creating');
      await submitListing({
        categoryId:    data.categoryId,
        title:         data.title,
        description:   data.description,
        price:         data.price,
        currency:      data.currency,
        city:          data.city,
        country:       data.country    || undefined,
        district:      data.district   || undefined,
        neighborhood:  data.neighborhood || undefined,
        // The deepest catalog region. When present the backend resolves
        // city/governorate/neighborhood from it and discards the text above, so
        // the two can't drift; `city` is still sent because the column is NOT NULL
        // and the legacy no-region path relies on it.
        regionSlug:    data.regionSlug || undefined,
        address:       data.address    || undefined,
        // Map pin: both or neither. `toValidCoords` also rejects a stray 0,0, so
        // a half-filled or zero-defaulted pair never reaches the API.
        ...(pinCoords ? { latitude: pinCoords.lat, longitude: pinCoords.lng } : {}),
        condition:     data.condition,
        attributes,
        // Vehicle-only top-level fields
        ...(isVehicle ? {
          make:         data.make       || undefined,
          series:       data.series     || undefined,
          model:        data.model      || undefined,
          chassis:      data.chassis    || undefined,
          year:         data.year       || undefined,
          mileage:      data.mileage    ?? undefined,
          seats:        data.seats      ?? undefined,
          color:        data.color      || undefined,
          heavyDamage:  data.heavyDamage,
          plateNumber:  data.plateNumber || undefined,
          damageReport:  Object.keys(damagePayload).length > 0 ? damagePayload : undefined,
          technicalSpecs:data.technicalSpecs?.length ? data.technicalSpecs : undefined,
          vehicleDetails,
        } : {}),
        images:          imagePayload.length ? imagePayload : undefined,
        phoneNumber:     data.phoneNumber || undefined,
        showPhoneNumber: data.showPhoneNumber ?? true,
        acceptsOffers:   data.acceptsOffers ?? true,
      });

      toast.success(successMessage);
      if (onSuccess) onSuccess();
      else router.push('/');
    } catch (err) {
      // A 400 from the API carries per-field detail in `ApiError.errors`; showing
      // only `message` turns every rejection into an unactionable "Validation
      // failed". Name the fields instead, and log the full object so a mismatch
      // between our schema and the backend's is diagnosable from the console.
      if (err instanceof ApiError && err.errors && Object.keys(err.errors).length) {
        console.error('[create listing] validation errors from API:', err.errors);
        const detail = Object.entries(err.errors)
          .map(([field, msgs]) => `${field}: ${(msgs ?? []).join('، ')}`)
          .join(' | ');
        toast.error(`${err.message} — ${detail}`);
      } else {
        toast.error(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : 'حدث خطأ ما. يرجى المحاولة مجدداً.',
        );
      }
    } finally {
      setSubmitPhase('idle');
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (mounted && !isAuthenticated) return null;

  // A business whose store isn't APPROVED gets the «قيد المراجعة» card instead of the
  // wizard — filling in six steps only to eat a 403 on submit is the worst outcome.
  if (mounted && isAuthenticated && (gate.locked || (gate.gated && gate.loading))) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <StoreGateBlock surface="listing" />
        </div>
      </div>
    );
  }

  const isReview = !!current.customNav;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-7">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            <span className="text-blue-600">أضف</span> إعلان
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            الخطوة {safeIdx + 1} من {totalSteps} — {current.label}
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator steps={steps.map((s) => s.label)} current={safeIdx + 1} />

        {/* Step card */}
        <div className="mt-6 bg-white rounded-card shadow-pebble shadow-sm p-6 sm:p-8">
          {current.node}
        </div>

        {/* Navigation bar (hidden on the review step, which submits itself) */}
        {!isReview && (
          <div className="flex items-center justify-between mt-5">
            {safeIdx > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
                السابق
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
            >
              {safeIdx === totalSteps - 2 ? 'مراجعة' : 'التالي'}
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Back button on review step */}
        {isReview && (
          <div className="flex justify-end mt-5">
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
              السابق
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
