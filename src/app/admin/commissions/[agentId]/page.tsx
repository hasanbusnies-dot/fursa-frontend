'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Coins, ChevronLeft, AlertTriangle, Inbox, Info, Phone, Printer, Download,
} from 'lucide-react';
import { AdminNav } from '@/components/admin/AdminNav';
import { useAuthStore } from '@/store/auth.store';
import {
  adminCommissionsService,
  type CommissionAgentDetail,
  type CommissionPaymentRow,
  type CommissionsQuery,
} from '@/services/admin-commissions.service';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

const METHOD_LABEL: Record<string, string> = {
  ONLINE: 'Online', CASH: 'Nakit', FREE: 'Ücretsiz',
};
const CAMPAIGN_LABEL: Record<string, string> = {
  FULL_PRICE: 'Tam fiyat', DISCOUNT_33: '%33 indirim', FIRST_MONTH_FREE: 'İlk ay ücretsiz',
};

function methodLabel(m?: string | null) { return m ? (METHOD_LABEL[m] ?? m) : '—'; }
function campaignLabel(c?: string | null) { return c ? (CAMPAIGN_LABEL[c] ?? c) : '—'; }

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(d?: string | null) {
  if (!d) return '—';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── CSV export ────────────────────────────────────────────────────────────────────

function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function downloadCsv(detail: CommissionAgentDetail) {
  const header = ['Mağaza', 'Tarih', 'Tutar (USD)', 'Yöntem', 'Kampanya', 'Sahip kendi ödedi', 'Komisyon kazandırır'];
  const rows = detail.payments.map((p) => [
    p.storeName,
    formatDate(p.chargedAt),
    p.netAmountUsd,
    methodLabel(p.method),
    campaignLabel(p.campaign),
    p.paidByOwnerSelf ? 'Evet' : 'Hayır',
    p.earnsCommission ? 'Evet' : 'Hayır',
  ]);
  // Prepend a UTF-8 BOM so Excel renders Turkish characters correctly.
  const csv = '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (detail.agent.name || detail.agent.id).replace(/[^\p{L}\p{N}]+/gu, '_');
  a.href = url;
  a.download = `komisyon-${safeName}-${detail.period.label.replace(/[^\p{L}\p{N}]+/gu, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function AdminCommissionAgentPage() {
  const params = useParams<{ agentId: string }>();
  const agentId = params?.agentId;
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  const [query, setQuery]     = useState<CommissionsQuery | null>(null);
  const [detail, setDetail]   = useState<CommissionAgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  // Read the period/range off the URL (no useSearchParams → no Suspense boundary).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const period = sp.get('period');
    const from = sp.get('from');
    const to = sp.get('to');
    if (period) setQuery({ period });
    else if (from && to) setQuery({ from, to });
    else setQuery({ period: currentMonth() }); // arrived without params → current month
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || user?.userType !== 'ADMIN') router.replace('/admin/login');
  }, [mounted, isAuthenticated, user, router]);

  const load = useCallback(() => {
    if (!agentId || !query) return;
    setLoading(true);
    setError(false);
    adminCommissionsService.agentDetail(agentId, query)
      .then(setDetail)
      .catch((err) => {
        console.error('[AdminCommissionAgent] fetch error:', err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [agentId, query]);

  useEffect(() => {
    if (!mounted || user?.userType !== 'ADMIN' || !query) return;
    load();
  }, [mounted, user, query, load]);

  // Back to the summary on the same period.
  const backHref = (() => {
    const qs = new URLSearchParams();
    if (query?.period) qs.set('period', query.period);
    else if (query?.from && query?.to) { qs.set('from', query.from); qs.set('to', query.to); }
    const s = qs.toString();
    return s ? `/admin/commissions?${s}` : '/admin/commissions';
  })();

  if (!mounted || !isAuthenticated || user?.userType !== 'ADMIN') return null;

  const payments = detail?.payments ?? [];
  // Payments are chargedAt ASC; the base (non-earning) ones come first. Mark where the
  // threshold is crossed so the paper trail reads clearly.
  const firstEarningIdx = payments.findIndex((p) => p.earnsCommission);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:py-2 print:max-w-none">
        {/* Back — hidden in print */}
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 mb-4 print:hidden"
        >
          <ChevronLeft className="w-4 h-4" />
          Komisyonlar
        </Link>

        {/* Page header — chrome hidden in print */}
        <div className="flex items-center gap-3 mb-6 print:hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-sm">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Temsilci Komisyonu</h1>
            <p className="text-sm text-gray-500">Ödeme bazında komisyon dökümü.</p>
          </div>
        </div>

        <div className="print:hidden"><AdminNav /></div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 animate-pulse h-72" />
        ) : error || !detail ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <AlertTriangle className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Rapor yüklenemedi.</p>
            <button onClick={load} className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline">
              Tekrar dene
            </button>
          </div>
        ) : (
          <>
            {/* Actions — hidden in print */}
            <div className="flex flex-wrap gap-2 mb-5 print:hidden">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Yazdır
              </button>
              <button
                onClick={() => downloadCsv(detail)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                CSV indir
              </button>
            </div>

            {/* print-area: the ONLY thing that prints (see @media print in globals.css) */}
            <div className="print-area">

            {/* Identity + period + applied config */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 print:border-0 print:p-0 print:mb-4">
              <h2 className="text-xl font-bold text-gray-900">{detail.agent.name}</h2>
              {detail.agent.phone && (
                <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-1" dir="ltr">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  {detail.agent.phone}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
                <span className="font-semibold text-gray-800">{detail.period.label}</span>
                <span className="text-gray-300">·</span>
                <span>Eşik: {detail.summary.threshold} ödeme</span>
                <span className="text-gray-300">·</span>
                <span>Ödeme başına: {formatMoney(detail.config.amountPerPaymentUsd, 'USD')}</span>
              </div>
            </div>

            {/* Summary line — reconciles with the summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <SummaryStat label="Uygun ödeme"   value={String(detail.summary.qualifyingPayments)} />
              <SummaryStat label="Komisyonlu"    value={String(detail.summary.commissionablePayments)} />
              <SummaryStat label="Ödeme başına"  value={formatMoney(detail.summary.amountPerPaymentUsd, 'USD')} />
              <SummaryStat
                label="Ödenecek komisyon"
                value={formatMoney(detail.summary.commissionUsd, 'USD')}
                emphasized
              />
            </div>

            {/* Payments */}
            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3 bg-white border border-gray-200 rounded-2xl">
                <Inbox className="w-10 h-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">Bu dönemde ödeme yok.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden print:border-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs">
                        <th className="text-start font-semibold px-4 py-3">Mağaza</th>
                        <th className="text-start font-semibold px-4 py-3 whitespace-nowrap">Tarih</th>
                        <th className="text-end font-semibold px-4 py-3 whitespace-nowrap">Tutar</th>
                        <th className="text-start font-semibold px-4 py-3">Yöntem</th>
                        <th className="text-start font-semibold px-4 py-3">Kampanya</th>
                        <th className="text-end font-semibold px-4 py-3 whitespace-nowrap">Komisyon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payments.map((p, i) => (
                        <Row
                          key={p.chargeId}
                          p={p}
                          amountPerPayment={detail.summary.amountPerPaymentUsd}
                          showThresholdDivider={firstEarningIdx > 0 && i === firstEarningIdx}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="flex items-center gap-1.5 px-4 py-3 border-t border-gray-100 text-[11px] text-gray-400 print:hidden">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  İlk {detail.summary.threshold} ödeme baz kabul edilir; komisyon manuel olarak ödenir.
                </p>
              </div>
            )}

            </div>{/* /print-area */}
          </>
        )}
      </div>
    </div>
  );
}

// ── Bits ────────────────────────────────────────────────────────────────────────

function SummaryStat({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className={cn(
      'rounded-2xl p-4 border',
      emphasized ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200',
    )}>
      <p className={cn('text-xl font-extrabold leading-none', emphasized ? 'text-green-700' : 'text-gray-800')}>
        {value}
      </p>
      <p className="text-xs text-gray-500 mt-1.5">{label}</p>
    </div>
  );
}

function Row({
  p, amountPerPayment, showThresholdDivider,
}: {
  p: CommissionPaymentRow;
  amountPerPayment: string;
  showThresholdDivider: boolean;
}) {
  return (
    <>
      {showThresholdDivider && (
        <tr className="bg-amber-50">
          <td colSpan={6} className="px-4 py-1.5 text-[11px] font-bold text-amber-700 uppercase tracking-wide">
            Eşik aşıldı — buradan sonrası komisyon kazandırır
          </td>
        </tr>
      )}
      <tr className={cn('transition-colors', p.earnsCommission ? 'hover:bg-gray-50' : 'bg-gray-50/40 text-gray-400')}>
        <td className="px-4 py-3 font-semibold">
          <span className={p.earnsCommission ? 'text-gray-800' : 'text-gray-500'}>{p.storeName}</span>
          {p.paidByOwnerSelf && (
            <span className="ms-2 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 align-middle">
              Sahip kendi ödedi
            </span>
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.chargedAt)}</td>
        <td className="px-4 py-3 text-end tabular-nums whitespace-nowrap">{formatMoney(p.netAmountUsd, 'USD')}</td>
        <td className="px-4 py-3">{methodLabel(p.method)}</td>
        <td className="px-4 py-3">{campaignLabel(p.campaign)}</td>
        <td className="px-4 py-3 text-end whitespace-nowrap">
          {p.earnsCommission ? (
            <span className="font-extrabold text-green-600 tabular-nums">+{formatMoney(amountPerPayment, 'USD')}</span>
          ) : (
            <span className="text-[11px] font-semibold text-gray-400">Baz</span>
          )}
        </td>
      </tr>
    </>
  );
}
