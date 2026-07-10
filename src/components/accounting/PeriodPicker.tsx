'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AccountingQuery } from '@/services/accounting.service';
import { cn } from '@/lib/utils';

type Mode = 'month' | 'range';

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, (m - 1) + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('ar', { month: 'long', year: 'numeric' });
}

/** Month-stepper / custom-range picker (Arabic). Emits the active AccountingQuery via
 *  onChange — month mode always has one; range mode emits null until "تطبيق". Defaults
 *  to the current month on mount. */
export function PeriodPicker({ onChange }: { onChange: (q: AccountingQuery | null) => void }) {
  const [mode, setMode]   = useState<Mode>('month');
  const [month, setMonth] = useState(currentMonth);
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput]     = useState('');
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);

  const thisMonth = useMemo(currentMonth, []);
  const atCurrentMonth = month >= thisMonth;

  const query: AccountingQuery | null = useMemo(() => {
    if (mode === 'month') return { period: month };
    return range ? { from: range.from, to: range.to } : null;
  }, [mode, month, range]);

  // Emit whenever the effective query changes. onChange is held in a ref so a parent
  // passing an inline function doesn't retrigger the effect.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const key = query ? JSON.stringify(query) : 'none';
  useEffect(() => { onChangeRef.current(query); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const rangeValid = fromInput !== '' && toInput !== '' && fromInput <= toInput;

  return (
    <div className="bg-white shadow-pebble rounded-card p-4 mb-6">
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {([['month', 'شهر'], ['range', 'نطاق تاريخي']] as [Mode, string][]).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              mode === m ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'month' ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
            aria-label="الشهر السابق"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="min-w-[150px] text-center text-sm font-bold text-gray-800 capitalize">
            {monthLabel(month)}
          </span>
          <button
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={atCurrentMonth}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="الشهر التالي"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {!atCurrentMonth && (
            <button onClick={() => setMonth(thisMonth)} className="text-xs font-semibold text-orange-600 hover:text-orange-700">
              هذا الشهر
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">من</label>
            <input
              type="date"
              value={fromInput}
              max={toInput || undefined}
              onChange={(e) => setFromInput(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">إلى</label>
            <input
              type="date"
              value={toInput}
              min={fromInput || undefined}
              onChange={(e) => setToInput(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
            />
          </div>
          <button
            onClick={() => { if (rangeValid) setRange({ from: fromInput, to: toInput }); }}
            disabled={!rangeValid}
            className="px-5 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            تطبيق
          </button>
        </div>
      )}
    </div>
  );
}
