'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  TrendingUp, Wallet, ArrowDownToLine, HandCoins, ShieldCheck, ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { PeriodPicker } from '@/components/accounting/PeriodPicker';
import {
  accountingService,
  type AccountingOverview,
  type AccountingQuery,
  type ReconciliationReport,
} from '@/services/accounting.service';
import { formatMoney } from '@/lib/money';
import { UI_AR } from '@/lib/staff-labels';

function prettyType(t: string): string {
  return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Card shell ──────────────────────────────────────────────────────────────────

function Card({
  title, icon: Icon, iconCls, children,
}: {
  title: string;
  icon: React.ElementType;
  iconCls: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white shadow-pebble rounded-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconCls}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function AmountRow({ label, amount, currency, strong }: { label: string; amount: string; currency: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className={strong ? 'text-sm font-semibold text-gray-700' : 'text-xs text-gray-500'}>{label}</span>
      <span className={`tabular-nums ${strong ? 'text-base font-extrabold text-gray-900' : 'text-sm font-bold text-gray-700'}`} dir="ltr">
        {formatMoney(amount, currency)}
      </span>
    </div>
  );
}

function EmptyLine() {
  return <p className="text-xs text-gray-400 py-1.5">لا توجد بيانات.</p>;
}

// ── Reconciliation health ─────────────────────────────────────────────────────────

function ReconciliationCard({ report }: { report: ReconciliationReport | null }) {
  if (!report) return null;
  const checks = Object.entries(report);
  const issues = checks.filter(([, rows]) => Array.isArray(rows) && rows.length > 0);
  const healthy = issues.length === 0;

  return (
    <Card
      title="فحوصات التسوية"
      icon={healthy ? ShieldCheck : ShieldAlert}
      iconCls={healthy ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}
    >
      {checks.length === 0 ? (
        <EmptyLine />
      ) : healthy ? (
        <p className="text-sm font-semibold text-green-600">جميع فحوصات السلامة سليمة.</p>
      ) : (
        <div className="space-y-1.5">
          {issues.map(([key, rows]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-xs text-gray-600">{prettyType(key)}</span>
              <span className="text-xs font-bold text-red-600">{rows.length} مشكلة</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function AccountingOverviewPage() {
  const [query, setQuery]       = useState<AccountingQuery | null>(null);
  const [data, setData]         = useState<AccountingOverview | null>(null);
  const [recon, setRecon]       = useState<ReconciliationReport | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  const load = useCallback(() => {
    if (!query) return;
    setLoading(true); setError(false);
    Promise.all([
      accountingService.overview(query),
      accountingService.reconciliation().catch(() => null),
    ])
      .then(([ov, rc]) => { setData(ov); setRecon(rc); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">نظرة عامة</h1>
          <p className="text-sm text-gray-500">لمحة مالية سريعة.</p>
        </div>
      </div>

      <PeriodPicker onChange={setQuery} />

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-card shadow-pebble animate-pulse h-40" />
          ))}
        </div>
      ) : error || !data ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <AlertTriangle className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">تعذّر تحميل البيانات.</p>
          <button onClick={load} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline">
            {UI_AR.retry}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue recognized */}
          <Card title="الإيرادات المُحقَّقة" icon={TrendingUp} iconCls="bg-green-100 text-green-600">
            {data.revenueRecognized.totals.length === 0 ? <EmptyLine /> : (
              <>
                {data.revenueRecognized.totals.map((t) => (
                  <AmountRow key={t.currency} label={`الإجمالي (${t.currency})`} amount={t.amount} currency={t.currency} strong />
                ))}
                {data.revenueRecognized.byType.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    {data.revenueRecognized.byType.map((b, i) => (
                      <AmountRow key={`${b.type}-${b.currency}-${i}`} label={prettyType(b.type)} amount={b.amount} currency={b.currency} />
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>

          {/* Platform liability */}
          <Card title="التزام المنصّة" icon={Wallet} iconCls="bg-blue-100 text-blue-600">
            {data.platformLiability.length === 0 ? <EmptyLine /> : data.platformLiability.map((l) => (
              <AmountRow key={l.currency} label={l.currency} amount={l.amount} currency={l.currency} strong />
            ))}
            <p className="text-[11px] text-gray-400 mt-2">إجمالي الرصيد المحفوظ في محافظ المستخدمين.</p>
          </Card>

          {/* Top-up mix */}
          <Card title="توزيع الشحن" icon={ArrowDownToLine} iconCls="bg-orange-100 text-orange-600">
            {data.topupMix.length === 0 ? <EmptyLine /> : data.topupMix.map((m, i) => (
              <AmountRow key={`${m.type}-${m.currency}-${i}`} label={`${prettyType(m.type)} (${m.currency})`} amount={m.amount} currency={m.currency} />
            ))}
          </Card>

          {/* Agent outstanding */}
          <Card title="النقد المعلّق لدى المندوبين" icon={HandCoins} iconCls="bg-amber-100 text-amber-600">
            {data.agentOutstanding.length === 0 ? <EmptyLine /> : data.agentOutstanding.map((a) => (
              <AmountRow key={a.currency} label={a.currency} amount={a.amount} currency={a.currency} strong />
            ))}
            <p className="text-[11px] text-gray-400 mt-2">تحصيلات لم تُسوَّ بعد مع المركز.</p>
          </Card>

          {/* Reconciliation */}
          <ReconciliationCard report={recon} />
        </div>
      )}
    </div>
  );
}
