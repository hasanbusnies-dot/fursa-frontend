'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Coins, ChevronLeft, ChevronRight, AlertTriangle, Inbox, Info,
} from 'lucide-react';
import { AdminNav } from '@/components/admin/AdminNav';
import { CommissionConfigPanel } from '@/components/admin/CommissionConfigPanel';
import { useAdminAuthStore } from '@/store/auth.store';
import {
  adminCommissionsService,
  type CommissionsReport,
  type CommissionsQuery,
} from '@/services/admin-commissions.service';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { UI_AR } from '@/lib/staff-labels';

type Mode = 'month' | 'range';

// ── Month helpers (YYYY-MM, no Date parsing of the report's money) ─────────────────

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

// ── Summary cards ───────────────────────────────────────────────────────────────

function SummaryHeader({ report }: { report: CommissionsReport }) {
  const s = report.summary;
  const cards = [
    { label: 'إجمالي المندوبين', value: String(s.totalAgents ?? 0),            cls: 'text-blue-600'  },
    { label: 'إجمالي المدفوعات', value: String(s.totalQualifyingPayments ?? 0), cls: 'text-gray-800'  },
    { label: 'إجمالي العمولات',  value: formatMoney(s.totalCommissionUsd ?? '0', 'USD'), cls: 'text-green-600' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="bg-white shadow-pebble rounded-card p-4">
          <p className={cn('text-2xl font-extrabold leading-none', c.cls)}>{c.value}</p>
          <p className="text-xs text-gray-500 mt-1.5">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function AdminCommissionsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAdminAuthStore();
  const [mounted, setMounted] = useState(false);

  const [mode, setMode]     = useState<Mode>('month');
  const [month, setMonth]   = useState(currentMonth);
  // Custom-range inputs (YYYY-MM-DD) + the applied range actually queried.
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput]     = useState('');
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);

  const [report, setReport]   = useState<CommissionsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const thisMonth = useMemo(currentMonth, []);
  const atCurrentMonth = month >= thisMonth; // no future data → cap "next"

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || user?.userType !== 'ADMIN') router.replace('/admin/login');
  }, [mounted, isAuthenticated, user, router]);

  // The active query: month mode always has one; range mode only once applied.
  const query: CommissionsQuery | null = useMemo(() => {
    if (mode === 'month') return { period: month };
    return range ? { from: range.from, to: range.to } : null;
  }, [mode, month, range]);

  const load = useCallback(() => {
    if (!query) { setReport(null); setLoading(false); return; }
    setLoading(true);
    setError(false);
    adminCommissionsService.report(query)
      .then(setReport)
      .catch((err) => {
        console.error('[AdminCommissions] fetch error:', err);
        setError(true);
        setReport(null);
      })
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    if (!mounted || user?.userType !== 'ADMIN') return;
    load();
  }, [mounted, user, load]);

  const rangeValid = fromInput !== '' && toInput !== '' && fromInput <= toInput;
  const applyRange = () => { if (rangeValid) setRange({ from: fromInput, to: toInput }); };

  // Carry the current period/range into the agent-detail URL so the drill-down opens
  // on exactly what the summary is showing.
  const agentHref = useCallback((agentId: string): string => {
    const qs = new URLSearchParams();
    if (query?.period) qs.set('period', query.period);
    else if (query?.from && query?.to) { qs.set('from', query.from); qs.set('to', query.to); }
    return `/admin/commissions/${agentId}?${qs.toString()}`;
  }, [query]);

  if (!mounted || !isAuthenticated || user?.userType !== 'ADMIN') return null;

  const agents = report?.agents ?? [];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-20 py-8">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-sm">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">العمولات</h1>
            <p className="text-sm text-gray-500">تقرير عمولات المندوبين وإعداداتها.</p>
          </div>
        </div>

        <AdminNav />

        {/* Config editor */}
        <CommissionConfigPanel onSaved={load} />

        {/* Period picker */}
        <div className="bg-white shadow-pebble rounded-card p-4 mb-6">
          {/* Mode toggle */}
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
              {/* Prev = older month; Next = newer, capped at the current month. LTR layout. */}
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
                <button
                  onClick={() => setMonth(thisMonth)}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                >
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
                onClick={applyRange}
                disabled={!rangeValid}
                className="px-5 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                تطبيق
              </button>
            </div>
          )}
        </div>

        {/* Applied-config banner — what these numbers were computed with */}
        {report && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 mb-6 text-sm text-blue-800">
            <Info className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{report.period.label}</span>
            <span className="text-blue-300">·</span>
            <span>العتبة: {report.config.thresholdPaymentsPerPeriod} دفعة</span>
            <span className="text-blue-300">·</span>
            <span>لكل دفعة: {formatMoney(report.config.amountPerPaymentUsd, 'USD')}</span>
          </div>
        )}

        {/* Summary */}
        {report && <SummaryHeader report={report} />}

        {/* Content */}
        {mode === 'range' && !range ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Inbox className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">اختر نطاقاً تاريخياً.</p>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-card shadow-pebble animate-pulse h-64" />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <AlertTriangle className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">تعذّر تحميل التقرير.</p>
            <button onClick={load} className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline">
              {UI_AR.retry}
            </button>
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <Inbox className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">لا توجد بيانات مندوبين في هذه الفترة.</p>
          </div>
        ) : (
          <div className="bg-white shadow-pebble rounded-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs">
                    <th className="text-start font-semibold px-4 py-3">المندوب</th>
                    <th className="text-end font-semibold px-4 py-3 whitespace-nowrap">الدفعات المؤهَّلة</th>
                    <th className="text-end font-semibold px-4 py-3 whitespace-nowrap">العتبة</th>
                    <th className="text-end font-semibold px-4 py-3 whitespace-nowrap">المُحتسَبة</th>
                    <th className="text-end font-semibold px-4 py-3 whitespace-nowrap">لكل دفعة</th>
                    <th className="text-end font-semibold px-4 py-3 whitespace-nowrap">العمولة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {agents.map((a) => (
                    <tr
                      key={a.agentId}
                      onClick={() => router.push(agentHref(a.agentId))}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        <span className="text-blue-600 hover:text-blue-700">{a.agentName}</span>
                      </td>
                      <td className="px-4 py-3 text-end tabular-nums text-gray-600">{a.qualifyingPayments}</td>
                      <td className="px-4 py-3 text-end tabular-nums text-gray-400">{a.threshold}</td>
                      <td className="px-4 py-3 text-end tabular-nums text-gray-600">{a.commissionablePayments}</td>
                      <td className="px-4 py-3 text-end tabular-nums text-gray-600 whitespace-nowrap">
                        {formatMoney(a.amountPerPayment, 'USD')}
                      </td>
                      <td className="px-4 py-3 text-end tabular-nums font-extrabold text-green-600 whitespace-nowrap">
                        {formatMoney(a.commissionUsd, 'USD')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="flex items-center gap-1.5 px-4 py-3 border-t border-gray-100 text-[11px] text-gray-400">
              <Info className="w-3.5 h-3.5 shrink-0" />
              تُدفع العمولة يدوياً.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
