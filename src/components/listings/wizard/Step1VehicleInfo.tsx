'use client';

import type { UseFormReturn } from 'react-hook-form';
import { AlertCircle } from 'lucide-react';
import type { WizardFormData } from './schema';
import {
  CAR_COLORS, VEHICLE_MAKES, FUEL_TYPE_OPTIONS, TRANSMISSION_OPTIONS,
  BODY_TYPE_OPTIONS, DRIVETRAIN_OPTIONS, FROM_WHO_OPTIONS,
} from './schema';

interface Props { form: UseFormReturn<WizardFormData, any, WizardFormData> }

const inputCls = (err?: string) =>
  `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 transition-colors ${
    err
      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
  }`;

function Field({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{error}
        </p>
      )}
    </div>
  );
}

export function Step1VehicleInfo({ form }: Props) {
  const { register, setValue, watch, formState: { errors } } = form;
  const condition = watch('condition');
  const warranty  = watch('warranty');
  const tradeIn   = watch('tradeIn');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900">معلومات المركبة</h2>
        <p className="text-sm text-gray-500 mt-1">أخبرنا عن المركبة التي تريد إضافتها.</p>
      </div>

      {/* ── Condition ── */}
      <Field label="الحالة" required>
        <div className="grid grid-cols-2 gap-3">
          {(['USED', 'NEW'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setValue('condition', c, { shouldValidate: true })}
              className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                condition === c
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {c === 'USED' ? '🚗 مستعمل' : '✨ جديد'}
            </button>
          ))}
        </div>
      </Field>

      {/* ── Make / Series / Model ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="الماركة" required error={errors.make?.message}>
          <select {...register('make')} className={inputCls(errors.make?.message)}>
            <option value="">اختر</option>
            {VEHICLE_MAKES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="السلسلة" error={errors.series?.message}>
          <input {...register('series')} placeholder="مثال: Camry" className={inputCls(errors.series?.message)} />
        </Field>
        <Field label="الموديل" required error={errors.model?.message}>
          <input {...register('model')} placeholder="مثال: 2.5 SE" className={inputCls(errors.model?.message)} />
        </Field>
      </div>

      {/* ── Year / Gear Count ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="السنة" required error={errors.year?.message}>
          <select
            {...register('year', { setValueAs: (v) => (v === '' ? undefined : parseInt(v, 10)) })}
            className={inputCls(errors.year?.message)}
          >
            <option value="">اختر</option>
            {Array.from(
              { length: new Date().getFullYear() - 1980 + 2 },
              (_, i) => new Date().getFullYear() + 1 - i,
            ).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </Field>
        <Field label="عدد التروس" error={errors.gearCount?.message}>
          <input
            {...register('gearCount', { valueAsNumber: true })}
            type="number"
            placeholder="مثال: 5"
            min="1"
            max="12"
            className={inputCls(errors.gearCount?.message)}
          />
        </Field>
      </div>

      {/* ── Body Type / Fuel Type / Transmission ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="هيكل السيارة" error={errors.bodyType?.message}>
          <select {...register('bodyType')} className={inputCls(errors.bodyType?.message)}>
            <option value="">اختر</option>
            {BODY_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="نوع الوقود" error={errors.fuelType?.message}>
          <select {...register('fuelType')} className={inputCls(errors.fuelType?.message)}>
            <option value="">اختر</option>
            {FUEL_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="ناقل الحركة" error={errors.transmission?.message}>
          <select {...register('transmission')} className={inputCls(errors.transmission?.message)}>
            <option value="">اختر</option>
            {TRANSMISSION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      </div>

      {/* ── Mileage / Seats / Color ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="المسافة (كم)" error={errors.mileage?.message}>
          <input
            {...register('mileage', { valueAsNumber: true })}
            type="number"
            placeholder="مثال: 85000"
            min="0"
            className={inputCls(errors.mileage?.message)}
          />
        </Field>
        <Field label="عدد المقاعد" error={errors.seats?.message}>
          <input
            {...register('seats', { valueAsNumber: true })}
            type="number"
            placeholder="مثال: 5"
            min="1"
            max="20"
            className={inputCls(errors.seats?.message)}
          />
        </Field>
        <Field label="اللون" error={errors.color?.message}>
          <select {...register('color')} className={inputCls(errors.color?.message)}>
            <option value="">اختر اللون</option>
            {CAR_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      {/* ── Engine Power / Engine Capacity / Drivetrain ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="قوة المحرك (HP)" error={errors.enginePower?.message}>
          <input
            {...register('enginePower', { valueAsNumber: true })}
            type="number"
            placeholder="مثال: 150"
            min="0"
            className={inputCls(errors.enginePower?.message)}
          />
        </Field>
        <Field label="حجم المحرك (cc)" error={errors.engineCapacity?.message}>
          <input
            {...register('engineCapacity', { valueAsNumber: true })}
            type="number"
            placeholder="مثال: 1498"
            min="0"
            className={inputCls(errors.engineCapacity?.message)}
          />
        </Field>
        <Field label="نوع الدفع" error={errors.drivetrain?.message}>
          <select {...register('drivetrain')} className={inputCls(errors.drivetrain?.message)}>
            <option value="">اختر</option>
            {DRIVETRAIN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      </div>

      {/* ── Plate Number ── */}
      <Field label="رقم اللوحة" error={errors.plateNumber?.message}>
        <input
          {...register('plateNumber')}
          placeholder="مثال: 123456 دمشق"
          className={inputCls(errors.plateNumber?.message)}
        />
      </Field>

      {/* ── Warranty / Trade-In / From Who ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="ضمان">
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            {([true, false] as const).map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setValue('warranty', v, { shouldValidate: true })}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                  warranty === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {v ? 'نعم' : 'لا'}
              </button>
            ))}
          </div>
        </Field>

        <Field label="مقايضة">
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            {([true, false] as const).map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setValue('tradeIn', v, { shouldValidate: true })}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                  tradeIn === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {v ? 'نعم' : 'لا'}
              </button>
            ))}
          </div>
        </Field>

        <Field label="من" error={errors.fromWho?.message}>
          <select {...register('fromWho')} className={inputCls(errors.fromWho?.message)}>
            <option value="">اختر</option>
            {FROM_WHO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      </div>

      {/* ── Heavy Damage ── */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          {...register('heavyDamage')}
          type="checkbox"
          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400 cursor-pointer"
        />
        <span>
          <span className="text-sm font-medium text-gray-800 group-hover:text-gray-900">
            سجل حوادث خطيرة
          </span>
          <span className="block text-xs text-gray-400 mt-0.5">
            ضع علامة هنا إذا كانت المركبة تحمل سجل حوادث خطيرة رسمياً.
          </span>
        </span>
      </label>
    </div>
  );
}
