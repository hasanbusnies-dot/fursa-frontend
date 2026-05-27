'use client';

import { Phone } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import type { WizardFormData } from './schema';

interface Props {
  form: UseFormReturn<WizardFormData>;
}

export function Step6ContactInfo({ form }: Props) {
  const { register, watch, setValue } = form;
  const showPhoneNumber = watch('showPhoneNumber') ?? true;

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">معلومات التواصل</h2>
        <p className="text-sm text-gray-500 mt-1">
          أضف رقم هاتفك حتى يتمكن المشترون من التواصل معك مباشرة.
        </p>
      </div>

      {/* Phone number input */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">
          رقم الهاتف
        </label>
        <div className="relative">
          <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Phone className="w-4 h-4" />
          </span>
          <input
            {...register('phoneNumber')}
            type="tel"
            placeholder="مثال: 0911234567"
            className="w-full pe-10 ps-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <p className="text-xs text-gray-400">اتركه فارغاً لاستخدام رقم حسابك الافتراضي.</p>
      </div>

      {/* Show / hide toggle */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-800">إظهار رقم الهاتف للمشترين</p>
          <p className="text-xs text-gray-400 mt-0.5">إذا أخفيته، سيتواصل المشترون عبر الرسائل فقط.</p>
        </div>
        {/* dir=ltr so the toggle knob slides the same direction regardless of page RTL */}
        <div dir="ltr">
          <button
            type="button"
            role="switch"
            aria-checked={showPhoneNumber}
            onClick={() => setValue('showPhoneNumber', !showPhoneNumber, { shouldDirty: true })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              showPhoneNumber ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                showPhoneNumber ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
