'use client';

import { useEffect, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Send, Loader2, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import type { WizardFormData, DamageReportState } from './schema';
import { SVG_PANELS, STATUS_LABELS } from './schema';

const ENUM_AR: Record<string, string> = {
  USED: 'مستعمل', NEW: 'جديد',
  SEDAN: 'سيدان', HATCHBACK: 'هاتشباك', SUV: 'SUV', WAGON: 'ستيشن واغن',
  COUPE: 'كوبيه', CONVERTIBLE: 'كشف', VAN: 'فان', PICKUP: 'بيكاب', MINIVAN: 'ميني فان',
  GASOLINE: 'بنزين', DIESEL: 'ديزل', LPG: 'غاز (LPG)', HYBRID: 'هجين', ELECTRIC: 'كهربائي',
  MANUAL: 'يدوي', AUTOMATIC: 'أوتوماتيك', SEMI_AUTOMATIC: 'نصف أوتوماتيك', CVT: 'CVT',
  FWD: 'دفع أمامي (FWD)', RWD: 'دفع خلفي (RWD)', AWD: 'AWD', FOUR_WD: '4WD',
  OWNER: 'من المالك', DEALER: 'من معرض', RENTAL: 'سيارة إيجار', OTHER: 'أخرى',
};
function tr(v: string | undefined | null, fallback = ''): string {
  if (!v) return fallback;
  return ENUM_AR[v] ?? v;
}

interface Props {
  form: UseFormReturn<WizardFormData, any, WizardFormData>;
  damageReport: DamageReportState;
  photos: File[];
  isSubmitting: boolean;
  submitPhase: 'idle' | 'uploading' | 'creating';
  onSubmit: () => void;
}

function SpecRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-semibold text-gray-800">{String(value)}</span>
    </div>
  );
}

export function Step6Review({ form, damageReport, photos, isSubmitting, submitPhase, onSubmit }: Props) {
  const d = form.getValues();
  const [heroUrl, setHeroUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photos[0]) { setHeroUrl(null); return; }
    const url = URL.createObjectURL(photos[0]);
    setHeroUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photos]);

  const modifiedPanels = SVG_PANELS.filter(
    (p) => (damageReport[p.key]?.status ?? 'ORIGINAL') !== 'ORIGINAL',
  );

  const submitLabel = {
    idle:      'نشر الإعلان',
    uploading: 'جارٍ رفع الصور…',
    creating:  'جارٍ النشر…',
  }[submitPhase];

  const formattedPrice = d.price
    ? d.currency === 'USD'
      ? `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(d.price))}`
      : `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(d.price))} ل.س`
    : '—';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">معاينة</span>
          <span className="text-xs text-gray-400">— هكذا سيبدو إعلانك</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">مراجعة ونشر</h2>
      </div>

      {/* Preview card — mirrors [id]/page.tsx layout */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">

        {/* Title bar */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2">{d.title || '—'}</h3>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5" />
            <span>{[d.city, d.country].filter(Boolean).join(', ') || '—'}</span>
          </div>
        </div>

        {/* Price bar */}
        <div className="px-5 py-3 bg-orange-50 border-b border-orange-100 flex items-baseline gap-3">
          <span className="text-2xl font-black text-orange-600">{formattedPrice}</span>
          {d.condition && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
              {tr(d.condition, d.condition)}
            </span>
          )}
        </div>

        {/* Hero image + Specs table */}
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_3fr]">

          {/* Hero image */}
          <div className="bg-gray-100 aspect-[4/3] sm:aspect-auto sm:min-h-[220px] relative flex items-center justify-center">
            {heroUrl ? (
              <img src={heroUrl} alt="صورة الغلاف" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs">{photos.length} صورة مختارة</span>
              </div>
            )}
          </div>

          {/* Specs table */}
          <div className="px-5 py-4 border-t sm:border-t-0 sm:border-s border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">معلومات المركبة</p>
            <SpecRow label="الماركة"        value={d.make} />
            <SpecRow label="السلسلة"        value={d.series} />
            <SpecRow label="الموديل"        value={d.model} />
            <SpecRow label="السنة"          value={d.year} />
            <SpecRow label="الكيلومترات"    value={d.mileage != null ? `${new Intl.NumberFormat('en-US').format(d.mileage)} كم` : undefined} />
            <SpecRow label="الهيكل"         value={tr(d.bodyType)} />
            <SpecRow label="الوقود"         value={tr(d.fuelType)} />
            <SpecRow label="ناقل الحركة"    value={tr(d.transmission)} />
            <SpecRow label="عدد التروس"     value={d.gearCount} />
            <SpecRow label="المحرك (HP)"    value={d.enginePower} />
            <SpecRow label="المحرك (cc)"    value={d.engineCapacity} />
            <SpecRow label="نوع الدفع"      value={tr(d.drivetrain)} />
            <SpecRow label="اللون"          value={d.color} />
            <SpecRow label="المقاعد"        value={d.seats} />
            <SpecRow label="من"             value={tr(d.fromWho)} />
            <SpecRow label="ضمان"          value={d.warranty === true ? 'نعم' : d.warranty === false ? 'لا' : undefined} />
            <SpecRow label="مقايضة"        value={d.tradeIn === true ? 'نعم' : d.tradeIn === false ? 'لا' : undefined} />
            {d.heavyDamage && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                يحمل سجل حوادث خطيرة
              </div>
            )}
          </div>
        </div>

        {/* Damage + Tech specs footer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 border-t border-gray-100">

          {/* Damage summary */}
          <div className="px-5 py-4 border-b sm:border-b-0 sm:border-e border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">تقرير الأضرار</p>
            {modifiedPanels.length === 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <CheckCircle className="w-3.5 h-3.5" />
                جميع القطع أصلية
              </div>
            ) : (
              <div className="space-y-1">
                {modifiedPanels.map((p) => (
                  <div key={p.key} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{p.label}</span>
                    <span className="font-semibold text-gray-500">{STATUS_LABELS[damageReport[p.key]!.status]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tech specs summary */}
          <div className="px-5 py-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              التجهيزات ({d.technicalSpecs?.length ?? 0} ميزة)
            </p>
            {(d.technicalSpecs?.length ?? 0) === 0 ? (
              <p className="text-xs text-gray-400">لم يتم تحديد أي ميزة.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {d.technicalSpecs!.slice(0, 8).map((spec) => (
                  <span key={spec} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{spec}</span>
                ))}
                {d.technicalSpecs!.length > 8 && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                    +{d.technicalSpecs!.length - 8} أخرى
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submit button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-base shadow-sm"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
          {submitLabel}
        </button>
        {isSubmitting && (
          <p className="text-center text-xs text-gray-400 mt-2">يرجى الانتظار — لا تغلق الصفحة.</p>
        )}
      </div>
    </div>
  );
}
