'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Banknote, AlertTriangle, Inbox, Loader2, UserRound, Phone, Clock, CheckCircle2, History,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  accountingService,
  type AgentOutstanding,
  type Settlement,
} from '@/services/accounting.service';
import { ApiError } from '@/services/api';
import { formatMoney, compareAmounts } from '@/lib/money';

function formatDateTime(s?: string | null): string {
  if (!s) return '—';
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Outstanding row (agent × currency) ─────────────────────────────────────────────

function OutstandingCard({
  row, busy, onSettle,
}: {
  row: AgentOutstanding;
  busy: boolean;
  onSettle: () => void;
}) {
  const verified = row.byVerification?.verified ?? '0';
  const settleable = compareAmounts(verified, '0') > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5 truncate">
            <UserRound className="w-4 h-4 text-gray-400 shrink-0" /> {row.agentName}
          </p>
          {row.agentPhone && (
            <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1" dir="ltr">
              <Phone className="w-3 h-3" /> {row.agentPhone}
            </p>
          )}
        </div>
        <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{row.currency}</span>
      </div>

      <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
        <p className="text-[11px] text-gray-500 mb-0.5">Toplam bekleyen</p>
        <p className="text-xl font-extrabold text-gray-900 tabular-nums" dir="ltr">{formatMoney(row.outstanding, row.currency)}</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-green-50 py-1.5">
            <p className="text-[10px] text-green-600">Doğrulanmış</p>
            <p className="text-xs font-bold text-green-700 tabular-nums" dir="ltr">{formatMoney(verified, row.currency)}</p>
          </div>
          <div className="rounded-lg bg-amber-50 py-1.5">
            <p className="text-[10px] text-amber-600">Bekleyen</p>
            <p className="text-xs font-bold text-amber-700 tabular-nums" dir="ltr">{formatMoney(row.byVerification?.pending ?? '0', row.currency)}</p>
          </div>
          <div className="rounded-lg bg-red-50 py-1.5">
            <p className="text-[10px] text-red-500">Reddedilen</p>
            <p className="text-xs font-bold text-red-600 tabular-nums" dir="ltr">{formatMoney(row.byVerification?.rejected ?? '0', row.currency)}</p>
          </div>
        </div>
      </div>

      {row.ageDays != null && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400">
          <Clock className="w-3 h-3" /> En eski {row.ageDays} gün ({formatDateTime(row.oldestUnsettledAt)})
        </p>
      )}

      <button
        onClick={onSettle}
        disabled={busy || !settleable}
        title={settleable ? undefined : 'Mutabakat için doğrulanmış nakit gerekir.'}
        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        {settleable ? `Mutabakat (${formatMoney(verified, row.currency)})` : 'Doğrulanmış nakit yok'}
      </button>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function AccountingSettlementsPage() {
  const [outstanding, setOutstanding] = useState<AgentOutstanding[]>([]);
  const [history, setHistory] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError(false);
    Promise.all([
      accountingService.agentsOutstanding(),
      accountingService.listSettlements().catch(() => [] as Settlement[]),
    ])
      .then(([out, hist]) => { setOutstanding(out); setHistory(hist); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const settle = async (row: AgentOutstanding) => {
    const key = `${row.agentId}-${row.currency}`;
    setBusyKey(key);
    try {
      await accountingService.settleAgent(row.agentId, {
        currency: row.currency,
        idempotencyKey: crypto.randomUUID(),
      });
      toast.success(`${row.agentName} ile ${row.currency} mutabakatı yapıldı.`);
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        toast.error('Mutabakat için doğrulanmış nakit bulunmuyor.');
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Mutabakat başarısız.');
      }
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
          <Banknote className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mutabakat</h1>
          <p className="text-sm text-gray-500">Yalnızca doğrulanmış nakit mutabakatlanır.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-200 animate-pulse h-56" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <AlertTriangle className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Veriler yüklenemedi.</p>
          <button onClick={load} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline">Tekrar dene</button>
        </div>
      ) : (
        <>
          {/* Outstanding */}
          {outstanding.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3 mb-8">
              <Inbox className="w-10 h-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Bekleyen mutabakat yok.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {outstanding.map((row) => (
                <OutstandingCard
                  key={`${row.agentId}-${row.currency}`}
                  row={row}
                  busy={busyKey === `${row.agentId}-${row.currency}`}
                  onSettle={() => settle(row)}
                />
              ))}
            </div>
          )}

          {/* History */}
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-bold text-gray-800">Mutabakat Geçmişi</h2>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center bg-white border border-gray-200 rounded-2xl">Henüz mutabakat yok.</p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-50">
              {history.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.agentName ?? 'Temsilci'}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {formatDateTime(s.createdAt)}
                      {s.collectionsCount != null ? ` · ${s.collectionsCount} tahsilat` : ''}
                      {s.note ? ` · ${s.note}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-gray-900 tabular-nums shrink-0" dir="ltr">
                    {formatMoney(s.amount ?? s.total ?? '0', s.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
