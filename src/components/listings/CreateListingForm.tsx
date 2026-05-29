'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { listingsService } from '@/services/listings.service';
import { ApiError } from '@/services/api';
import { useAuth } from '@/hooks/use-auth';
import { StepIndicator } from './StepIndicator';
import { Step0CategorySelect } from './wizard/Step0CategorySelect';
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
  WIZARD_STEP_LABELS,
  STEP_TRIGGER_FIELDS,
} from './wizard/schema';

type SubmitPhase = 'idle' | 'uploading' | 'creating';

// Backward-compat re-export so existing DetailsStep.tsx import doesn't break
export type ListingFormData = WizardFormData;

export function CreateListingForm() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState(1);
  const totalSteps = WIZARD_STEP_LABELS.length;

  // ── Client-side auth guard ───────────────────────────────────────────────
  // Replaces the proxy.ts middleware guard, which depended on a client-only
  // cookie the server couldn't reliably see (caused a login → /listings/create
  // redirect loop). `mounted` defers the decision until after hydration so the
  // Zustand store has rehydrated and we don't redirect a logged-in user.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent('/listings/create')}`);
    }
  }, [mounted, isAuthenticated, router]);

  // ── React-Hook-Form (all scalar fields) ───────────────────────────────────
  // Cast needed: z.preprocess() makes Zod's input type diverge from output type,
  // which confuses @hookform/resolvers's inference. Runtime behaviour is correct.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<WizardFormData, any, WizardFormData>({
    resolver: zodResolver(wizardSchema) as any,
    defaultValues: {
      currency:        'SYP',
      categoryId:      '',
      condition:       'USED',
      heavyDamage:     false,
      country:         'سوريا',
      technicalSpecs:  [],
      showPhoneNumber: true,
      acceptsOffers:   true,
    },
  });

  // ── Out-of-RHF state ─────────────────────────────────────────────────────
  const [damageReport, setDamageReport] = useState<DamageReportState>(getDefaultDamageReport);
  const [photos, setPhotos]             = useState<File[]>([]);
  const [submitPhase, setSubmitPhase]   = useState<SubmitPhase>('idle');

  const isSubmitting = submitPhase !== 'idle';

  // ── Navigation ─────────────────────────────────────────────────────────────
  async function handleNext() {
    const fields = STEP_TRIGGER_FIELDS[step];
    if (fields && !(await form.trigger(fields))) {
      toast.error('يرجى تصحيح الأخطاء المحددة قبل المتابعة.');
      return;
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleBack() {
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handlePublish() {
    const valid = await form.trigger();
    if (!valid) {
      toast.error('بعض الحقول المطلوبة غير مكتملة. يرجى مراجعة النموذج.');
      return;
    }

    const data = form.getValues();

    try {
      // Upload photos → get CDN URLs
      let imagePayload: Array<{ url: string; sortOrder: number; isPrimary: boolean }> = [];
      if (photos.length > 0) {
        setSubmitPhase('uploading');
        const urls = await listingsService.uploadImages(photos);
        imagePayload = urls.map((url, i) => ({ url, sortOrder: i, isPrimary: i === 0 }));
      }

      // Build damage report payload (only non-original panels)
      const damagePayload = Object.fromEntries(
        SVG_PANELS
          .filter((p) => (damageReport[p.key]?.status ?? 'ORIGINAL') !== 'ORIGINAL')
          .map((p) => {
            const s = damageReport[p.key]!;
            return [p.key, { status: s.status, ...(s.detail ? { detail: s.detail } : {}) }];
          }),
      );

      // Send all vehicle fields inside vehicleDetails in addition to top-level,
      // because the backend may store (and return) them under vehicleDetails.
      const vehicleDetails = {
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
      };
      const hasVehicleDetails = true; // always include since make/model/year are required

      setSubmitPhase('creating');
      await listingsService.create({
        categoryId:    data.categoryId,
        title:         data.title,
        description:   data.description,
        price:         data.price,
        currency:      data.currency,
        city:          data.city,
        country:       data.country    || undefined,
        district:      data.district   || undefined,
        neighborhood:  data.neighborhood || undefined,
        condition:     data.condition,
        make:          data.make       || undefined,
        series:        data.series     || undefined,
        model:         data.model      || undefined,
        chassis:       data.chassis    || undefined,
        year:          data.year       || undefined,
        mileage:       data.mileage    ?? undefined,
        seats:         data.seats      ?? undefined,
        color:         data.color      || undefined,
        heavyDamage:   data.heavyDamage,
        plateNumber:   data.plateNumber || undefined,
        damageReport:  Object.keys(damagePayload).length > 0 ? damagePayload : undefined,
        technicalSpecs:data.technicalSpecs?.length ? data.technicalSpecs : undefined,
        images:          imagePayload.length ? imagePayload : undefined,
        vehicleDetails:  hasVehicleDetails ? vehicleDetails : undefined,
        phoneNumber:     data.phoneNumber || undefined,
        showPhoneNumber: data.showPhoneNumber ?? true,
        acceptsOffers:   data.acceptsOffers ?? true,
      });

      toast.success('تم إرسال إعلانك للمراجعة بنجاح!');
      router.push('/');
    } catch (err) {
      toast.error(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'حدث خطأ ما. يرجى المحاولة مجدداً.',
      );
    } finally {
      setSubmitPhase('idle');
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  // Logged-out users are being redirected (above); render nothing to avoid a
  // flash of the form. Pre-hydration (mounted=false) we still render the form so
  // the server and first client render match.
  if (mounted && !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-7">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            <span className="text-blue-600">أضف</span> إعلان
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            الخطوة {step} من {totalSteps} — {WIZARD_STEP_LABELS[step - 1]}
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator steps={[...WIZARD_STEP_LABELS]} current={step} />

        {/* Step card */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          {step === 1 && (
            <Step0CategorySelect
              form={form}
              onCategorySelected={() => {
                setStep(2);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
          {step === 2 && <Step1VehicleInfo  form={form} />}
          {step === 3 && <Step2AdDetails    form={form} />}
          {step === 4 && <Step3DamageReport damageReport={damageReport} onChange={setDamageReport} />}
          {step === 5 && <Step4TechSpecs    form={form} />}
          {step === 6 && <Step5Photos       photos={photos}   onChange={setPhotos} />}
          {step === 7 && <Step6ContactInfo  form={form} />}
          {step === 8 && (
            <Step6Review
              form={form}
              damageReport={damageReport}
              photos={photos}
              isSubmitting={isSubmitting}
              submitPhase={submitPhase}
              onSubmit={handlePublish}
            />
          )}
        </div>

        {/* Navigation bar: hidden on step 1 (auto-advances on category click) and on review step */}
        {step > 1 && step < totalSteps && (
          <div className="flex items-center justify-between mt-5">
            {step > 1 ? (
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
              {step === totalSteps - 1 ? 'مراجعة' : 'التالي'}
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Back button on review step (step 8) */}
        {step === totalSteps && (
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
