'use client';

import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { ChevronDown, Check } from 'lucide-react';
import type { WizardFormData, TechSpecCategory, TechSpecDef } from './schema';
import { TECH_SPECS, TECH_SPEC_VALUES, TECH_SPEC_CATEGORY_AR } from './schema';

interface Props { form: UseFormReturn<WizardFormData, any, WizardFormData> }

const CATEGORY_COLORS: Record<TechSpecCategory, string> = {
  Safety:     'text-red-600 bg-red-50 border-red-200',
  Interior:   'text-purple-600 bg-purple-50 border-purple-200',
  Exterior:   'text-blue-600 bg-blue-50 border-blue-200',
  Multimedia: 'text-green-600 bg-green-50 border-green-200',
};

function AccordionSection({
  category, items, selected, onToggle,
}: {
  category: TechSpecCategory;
  items: readonly TechSpecDef[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const checkedCount = items.filter((i) => selected.includes(i.value)).length;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/80 hover:bg-gray-100 transition-colors text-start"
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${CATEGORY_COLORS[category]}`}>
            {TECH_SPEC_CATEGORY_AR[category]}
          </span>
          {checkedCount > 0 && (
            <span className="text-xs text-gray-500 font-medium">
              {checkedCount} محدد
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Checkbox grid — 2 columns on mobile, 3 from md up. Arabic labels wrap,
          so rows align at the top rather than centring on a taller neighbour. */}
      {open && (
        <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-3 gap-y-2.5 gap-x-3">
          {items.map(({ value, label_ar }) => {
            const checked = selected.includes(value);
            return (
              <button
                key={value}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => onToggle(value)}
                className="flex items-start gap-2 text-start cursor-pointer group py-0.5"
              >
                <span
                  className={`shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    checked
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300 bg-white group-hover:border-blue-400'
                  }`}
                >
                  {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </span>
                <span
                  className={`text-[13px] sm:text-sm leading-snug transition-colors ${
                    checked ? 'text-gray-900 font-medium' : 'text-gray-600'
                  }`}
                >
                  {label_ar}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Step4TechSpecs({ form }: Props) {
  const { getValues, setValue, watch } = form;
  const selected: string[] = watch('technicalSpecs') ?? [];

  function toggle(item: string) {
    const current = getValues('technicalSpecs') ?? [];
    const next = current.includes(item)
      ? current.filter((s) => s !== item)
      : [...current, item];
    setValue('technicalSpecs', next);
  }

  function selectAll(category: TechSpecCategory) {
    const current = getValues('technicalSpecs') ?? [];
    const merged = Array.from(new Set([...current, ...TECH_SPEC_VALUES[category]]));
    setValue('technicalSpecs', merged);
  }

  function clearAll(category: TechSpecCategory) {
    const items = new Set(TECH_SPEC_VALUES[category]);
    const current = getValues('technicalSpecs') ?? [];
    setValue('technicalSpecs', current.filter((s) => !items.has(s)));
  }

  const totalSelected = selected.length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900">المواصفات الفنية</h2>
          <p className="text-sm text-gray-500 mt-1">
            ضع علامة على جميع الميزات والتجهيزات المتوفرة في المركبة.
          </p>
        </div>
        {totalSelected > 0 && (
          <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            <Check className="w-3 h-3" strokeWidth={3} />
            {totalSelected} ميزة محددة
          </span>
        )}
      </div>

      {(Object.keys(TECH_SPECS) as TechSpecCategory[]).map((cat) => (
        <div key={cat}>
          {/* Select / Clear all for this category */}
          <div className="flex items-center justify-start gap-3 mb-1.5">
            <button
              type="button"
              onClick={() => selectAll(cat)}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              تحديد الكل
            </button>
            <button
              type="button"
              onClick={() => clearAll(cat)}
              className="text-xs text-gray-400 hover:underline"
            >
              مسح
            </button>
          </div>
          <AccordionSection
            category={cat}
            items={TECH_SPECS[cat]}
            selected={selected}
            onToggle={toggle}
          />
        </div>
      ))}
    </div>
  );
}
