'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck, AlertTriangle, Inbox, UserRound, Phone, ChevronRight, Clock,
} from 'lucide-react';
import {
  accountingService,
  type AgentOutstanding,
} from '@/services/accounting.service';
import { formatMoney, compareAmounts } from '@/lib/money';
import { cn } from '@/lib/utils';

function hasPending(a: AgentOutstanding): boolean {
  return compareAmounts(a.byVerification?.pending ?? '0', '0') > 0;
}

export default function AccountingVerificationPage() {
  const [rows, setRows]       = useState<AgentOutstanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [onlyPending, setOnlyPending] = useState(true);

  const load = useCallback(() => {
    setLoading(true); setError(false);
    accountingService.agentsOutstanding()
      .then(setRows)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const shown = onlyPending ? rows.filter(hasPending) : rows;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
          <ClipboardCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tahsilat Doğrulama</h1>
          <p className="text-sm text-gray-500">Temsilci nakit tahsilatlarının makbuz doğrulaması (cüzdana dokunmaz).</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {([[true, 'Bekleyenler'], [false, 'Tümü']] as [boolean, string][]).map(([v, label]) => (
          <button
            key={label}
            onClick={() => setOnlyPending(v)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              onlyPending === v ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-200 animate-pulse h-44" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <AlertTriangle className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Temsilciler yüklenemedi.</p>
          <button onClick={load} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline">Tekrar dene</button>
        </div>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Inbox className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">{onlyPending ? 'Doğrulama bekleyen tahsilat yok.' : 'Kayıt yok.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((a) => (
            <Link
              key={`${a.agentId}-${a.currency}`}
              href={`/accounting/verification/${a.agentId}`}
              className="block bg-white border border-gray-200 rounded-2xl p-4 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5 truncate">
                    <UserRound className="w-4 h-4 text-gray-400 shrink-0" />
                    {a.agentName}
                  </p>
                  {a.agentPhone && (
                    <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1" dir="ltr">
                      <Phone className="w-3 h-3" /> {a.agentPhone}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </div>

              <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[11px] text-gray-500 mb-1">Bekleyen ({a.currency})</p>
                <p className="text-lg font-extrabold text-amber-600 tabular-nums" dir="ltr">
                  {formatMoney(a.byVerification?.pending ?? '0', a.currency)}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500" dir="ltr">
                  <span>✓ {formatMoney(a.byVerification?.verified ?? '0', a.currency)}</span>
                  <span className="text-red-400">✗ {formatMoney(a.byVerification?.rejected ?? '0', a.currency)}</span>
                </div>
              </div>

              {a.ageDays != null && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400">
                  <Clock className="w-3 h-3" /> En eski {a.ageDays} gün
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
