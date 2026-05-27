'use client';

import type { UseFormReturn } from 'react-hook-form';
import { AlertCircle, DollarSign } from 'lucide-react';
import type { WizardFormData } from './schema';
import { SYRIAN_GOVERNORATES } from './schema';

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

          <Field label="المحافظة" required error={errors.city?.message}>
            <select {...register('city')} className={inputCls(errors.city?.message)}>
              <option value="">اختر المحافظة</option>
              {SYRIAN_GOVERNORATES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </Field>

          <Field label="المنطقة" error={errors.district?.message}>
            <input
              {...register('district')}
              placeholder="مثال: المزة، الحمدانية"
              className={inputCls(errors.district?.message)}
            />
          </Field>

          <Field label="الحي" error={errors.neighborhood?.message}>
            <input
              {...register('neighborhood')}
              placeholder="مثال: شارع 6، بلوك B"
              className={inputCls(errors.neighborhood?.message)}
            />
          </Field>

        </div>
      </div>
    </div>
  );
}
