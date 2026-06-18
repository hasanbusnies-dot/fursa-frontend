'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Banknote, AlertTriangle, Inbox, Loader2, UserRound, Phone, Clock, CheckCircle2, History,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { PeriodPicker } from '@/components/accounting/PeriodPicker';
import {
  accountingService,
  type AgentOutstanding,
  type Settlement,
  type AccountingQuery,
} from '@/services/accounting.service';
import type { PageMeta } from '@/services/stores.service';
import { ApiError } from '@/services/api';
import { formatMoney, compareAmounts } from '@/lib/money';

const CURRENCIES = ['SYP', 'USD', 'EUR'] as const;

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

// ── History row ───────────────────────────────────────────────────────────────────
// The main area drills into the settlement detail (what it covered); the trailing
// chip jumps to the agent's full collection history — even for fully-settled agents
// who no longer appear in the outstanding list above.

function HistoryRow({ s }: { s: Settlement }) {
  const when = formatDateTime(s.settledAt ?? s.createdAt);
  const count = s.collectionCount ?? s.collectionsCount;
  const amount = s.amount ?? s.total ?? '0';

  return (
    <div className="flex items-stretch">
      <Link
        href={`/accounting/settlements/${s.id}`}
        className="flex-1 min-w-0 flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{s.agentName || 'Temsilci'}</p>
          {s.agentPhone && (
            <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1" dir="ltr">
              <Phone className="w-3 h-3 shrink-0" /> {s.agentPhone}
            </p>
          )}
          <p className="text-[11px] text-gray-400 mt-0.5">
            {when}
            {count != null ? ` · ${count} tahsilat` : ''}
            {s.note ? ` · ${s.note}` : ''}
          </p>
          {s.agentCode && (
            <p className="text-[10px] font-mono text-gray-300 mt-0.5 truncate" dir="ltr" title={s.agentCode}>
              Kod: {s.agentCode}
            </p>
          )}
        </div>
        <span className="text-sm font-bold text-gray-900 tabular-nums shrink-0" dir="ltr">
          {formatMoney(amount, s.currency)}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
      </Link>
      {s.agentId && (
        <Link
          href={`/accounting/verification/${s.agentId}?status=all`}
          title="Temsilcinin tüm tahsilat geçmişi"
          className="shrink-0 flex items-center gap-1 px-3 border-s border-gray-50 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"
        >
          <UserRound className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Geçmiş</span>
        </Link>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function AccountingSettlementsPage() {
  const [outstanding, setOutstanding] = useState<AgentOutstanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // History (filterable + paginated, independent of the live outstanding list).
  const [history, setHistory]   = useState<Settlement[]>([]);
  const [histMeta, setHistMeta] = useState<PageMeta | null>(null);
  const [histLoading, setHistLoading] = useState(true);
  const [period, setPeriod]     = useState<AccountingQuery | null>(null);
  const [agentFilter, setAgentFilter]       = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [page, setPage] = useState(1);
  const [agentOptions, setAgentOptions] = useState<{ id: string; name: string }[]>([]);

  const loadOutstanding = useCallback(() => {
    setLoading(true); setError(false);
    accountingService.agentsOutstanding()
      .then(setOutstanding)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const loadHistory = useCallback(() => {
    if (!period) return;
    setHistLoading(true);
    accountingService.settlementsHistory({
      ...period,
      agentId: agentFilter || undefined,
      currency: currencyFilter || undefined,
      page,
      limit: 20,
    })
      .then((res) => { setHistory(res.data); setHistMeta(res.meta); })
      .catch(() => { setHistory([]); setHistMeta(null); })
      .finally(() => setHistLoading(false));
  }, [period, agentFilter, currencyFilter, page]);

  useEffect(() => { loadOutstanding(); }, [loadOutstanding]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Stable agent dropdown sourced from all settlements (settled agents drop off the
  // outstanding list, so we can't derive it from there).
  useEffect(() => {
    accountingService.settlementsHistory({ limit: 100 })
      .then((res) => {
        const seen = new Map<string, string>();
        for (const s of res.data) if (s.agentId) seen.set(s.agentId, s.agentName ?? 'Temsilci');
        setAgentOptions([...seen].map(([id, name]) => ({ id, name })));
      })
      .catch(() => setAgentOptions([]));
  }, []);

  const onAgent    = (v: string) => { setAgentFilter(v); setPage(1); };
  const onCurrency = (v: string) => { setCurrencyFilter(v); setPage(1); };

  const settle = async (row: AgentOutstanding) => {
    const key = `${row.agentId}-${row.currency}`;
    setBusyKey(key);
    try {
      await accountingService.settleAgent(row.agentId, {
        currency: row.currency,
        idempotencyKey: crypto.randomUUID(),
      });
      toast.success(`${row.agentName} ile ${row.currency} mutabakatı yapıldı.`);
      loadOutstanding();
      loadHistory();
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

      {/* Outstanding (live state) */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-200 animate-pulse h-56" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <AlertTriangle className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Veriler yüklenemedi.</p>
          <button onClick={loadOutstanding} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline">Tekrar dene</button>
        </div>
      ) : outstanding.length === 0 ? (
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

      {/* History (audit) */}
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-gray-500" />
        <h2 className="text-sm font-bold text-gray-800">Mutabakat Geçmişi</h2>
      </div>

      <PeriodPicker onChange={(q) => { setPeriod(q); setPage(1); }} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={agentFilter}
          onChange={(e) => onAgent(e.target.value)}
          className="text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-100 cursor-pointer"
        >
          <option value="">Tüm temsilciler</option>
          {agentOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select
          value={currencyFilter}
          onChange={(e) => onCurrency(e.target.value)}
          className="text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-100 cursor-pointer"
        >
          <option value="">Tüm birimler</option>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {histLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 animate-pulse h-48" />
      ) : history.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center bg-white border border-gray-200 rounded-2xl">Bu filtrelerde mutabakat yok.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-50">
          {history.map((s) => <HistoryRow key={s.id} s={s} />)}

          {histMeta && (histMeta.hasPrevPage || histMeta.hasNextPage) && (
            <div className="flex items-center justify-between p-3">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!histMeta.hasPrevPage} className="flex items-center gap-1 text-sm font-semibold text-gray-600 disabled:opacity-40 hover:text-gray-900 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Önceki
              </button>
              <span className="text-xs text-gray-400">Sayfa {histMeta.page}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={!histMeta.hasNextPage} className="flex items-center gap-1 text-sm font-semibold text-gray-600 disabled:opacity-40 hover:text-gray-900 transition-colors">
                Sonraki <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
