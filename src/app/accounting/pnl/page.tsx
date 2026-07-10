'use client';

import { useCallback, useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle, Inbox } from 'lucide-react';
import { PeriodPicker } from '@/components/accounting/PeriodPicker';
import {
  accountingService,
  type Pnl,
  type PnlCurrencyBlock,
  type AccountingQuery,
} from '@/services/accounting.service';
import { formatMoney, compareAmounts } from '@/lib/money';
import { cn } from '@/lib/utils';
import { UI_AR, expenseCategoryLabel } from '@/lib/staff-labels';

function prettyType(t: string): string {
  return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function CurrencyCard({ block }: { block: PnlCurrencyBlock }) {
  const netSign = compareAmounts(block.net, '0'); // -1 | 0 | 1
  const netCls = netSign < 0 ? 'text-red-600' : 'text-green-600';

  return (
    <div className="bg-white shadow-pebble rounded-card overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-800">{block.currency}</h2>
        <span className={cn('text-lg font-extrabold tabular-nums', netCls)} dir="ltr">
          {formatMoney(block.net, block.currency)}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Revenue */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-green-700 uppercase tracking-wide">الإيرادات</span>
            <span className="text-sm font-extrabold text-green-700 tabular-nums" dir="ltr">
              {formatMoney(block.revenue.total, block.currency)}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {block.revenue.byType.length === 0 ? (
              <p className="text-xs text-gray-400 py-1">لا إيرادات.</p>
            ) : block.revenue.byType.map((r, i) => (
              <div key={`${r.type}-${i}`} className="flex items-center justify-between py-1.5">
                <span className="text-xs text-gray-500">{prettyType(r.type)}</span>
                <span className="text-sm text-gray-700 tabular-nums" dir="ltr">{formatMoney(r.amount, block.currency)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-red-700 uppercase tracking-wide">المصروفات</span>
            <span className="text-sm font-extrabold text-red-700 tabular-nums" dir="ltr">
              −{formatMoney(block.expenses.total, block.currency)}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {block.expenses.byCategory.length === 0 ? (
              <p className="text-xs text-gray-400 py-1">لا مصروفات.</p>
            ) : block.expenses.byCategory.map((e, i) => (
              <div key={`${e.categoryKey}-${i}`} className="flex items-center justify-between py-1.5">
                <span className="text-xs text-gray-500">{expenseCategoryLabel(e.categoryKey, e.label)}</span>
                <span className="text-sm text-gray-700 tabular-nums" dir="ltr">{formatMoney(e.amount, block.currency)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Net */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <span className="text-sm font-bold text-gray-800">الصافي</span>
          <span className={cn('text-lg font-extrabold tabular-nums', netCls)} dir="ltr">
            {formatMoney(block.net, block.currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AccountingPnlPage() {
  const [query, setQuery]     = useState<AccountingQuery | null>(null);
  const [data, setData]       = useState<Pnl | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = useCallback(() => {
    if (!query) return;
    setLoading(true); setError(false);
    accountingService.pnl(query)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const blocks = data?.byCurrency ?? [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الأرباح والخسائر</h1>
          <p className="text-sm text-gray-500">لكل عملة: الإيرادات − المصروفات = الصافي.</p>
        </div>
      </div>

      <PeriodPicker onChange={setQuery} />

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white rounded-card shadow-pebble animate-pulse h-72" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <AlertTriangle className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">تعذّر تحميل الأرباح والخسائر.</p>
          <button onClick={load} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline">
            {UI_AR.retry}
          </button>
        </div>
      ) : blocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Inbox className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">لا توجد بيانات في هذه الفترة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {blocks.map((b) => <CurrencyCard key={b.currency} block={b} />)}
        </div>
      )}
    </div>
  );
}
