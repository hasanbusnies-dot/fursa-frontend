'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Loader2, AlertTriangle, Inbox, CheckCircle2, XCircle, X,
  CalendarDays, UserRound, Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  accountingService,
  type AgentCollection,
  type AgentIdentity,
  type CollectionVerificationStatus,
} from '@/services/accounting.service';
import { ContractDoc } from '@/components/stores/ContractDoc';
import { CopyableId } from '@/components/accounting/CopyableId';
import { ApiError } from '@/services/api';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { VERIFICATION_STATUS_AR, SETTLEMENT_AR, UI_AR } from '@/lib/staff-labels';

const STATUS_FILTERS: { value: CollectionVerificationStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING_VERIFICATION', label: VERIFICATION_STATUS_AR.PENDING_VERIFICATION },
  { value: 'VERIFIED',             label: VERIFICATION_STATUS_AR.VERIFIED },
  { value: 'REJECTED',             label: VERIFICATION_STATUS_AR.REJECTED },
  { value: 'ALL',                  label: UI_AR.all },
];

// Initial filter from the URL: audit entry (settlement-history link) passes ?status=all
// → land on "all"; a specific status is honoured; bare entry (verification list /
// triage) → default to the pending queue.
function initialStatusFromParam(raw: string | null): CollectionVerificationStatus | 'ALL' {
  if (!raw) return 'PENDING_VERIFICATION';
  const up = raw.toUpperCase();
  if (up === 'ALL') return 'ALL';
  if (up === 'VERIFIED' || up === 'REJECTED' || up === 'PENDING_VERIFICATION') {
    return up as CollectionVerificationStatus;
  }
  return 'PENDING_VERIFICATION';
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING_VERIFICATION: { label: VERIFICATION_STATUS_AR.PENDING_VERIFICATION, cls: 'bg-amber-100 text-amber-800' },
  VERIFIED:             { label: VERIFICATION_STATUS_AR.VERIFIED,             cls: 'bg-green-100 text-green-700' },
  REJECTED:             { label: VERIFICATION_STATUS_AR.REJECTED,             cls: 'bg-red-100 text-red-700'     },
};

const SETTLED_FILTERS: { value: 'ALL' | 'true' | 'false'; label: string }[] = [
  { value: 'ALL',   label: UI_AR.all },
  { value: 'true',  label: SETTLEMENT_AR.settled },
  { value: 'false', label: SETTLEMENT_AR.unsettled },
];

// Mirror of the agent-side SettlementChip — settled vs unsettled.
function SettlementChip({ settlementId }: { settlementId?: string | null }) {
  return settlementId ? (
    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">{SETTLEMENT_AR.settled}</span>
  ) : (
    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">{SETTLEMENT_AR.unsettled}</span>
  );
}

function formatDateTime(s: string): string {
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleString('ar', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Reject modal ──────────────────────────────────────────────────────────────────

function RejectModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    const r = reason.trim();
    if (!r) { toast.error('الرجاء إدخال سبب الرفض.'); return; }
    setSaving(true);
    try { await onConfirm(r); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">رفض التحصيل</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          autoFocus
          placeholder="وضّح سبب الرفض…"
          className="block w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-colors resize-none"
        />
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">{UI_AR.cancel}</button>
          <button onClick={submit} disabled={saving || !reason.trim()} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {UI_AR.reject}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Collection card ─────────────────────────────────────────────────────────────

function CollectionCard({
  c, busy, onVerify, onReject,
}: {
  c: AgentCollection;
  busy: boolean;
  onVerify: () => void;
  onReject: () => void;
}) {
  const meta = STATUS_META[c.verificationStatus] ?? { label: c.verificationStatus, cls: 'bg-gray-100 text-gray-500' };
  const pending = c.verificationStatus === 'PENDING_VERIFICATION';

  return (
    <div className="bg-white shadow-pebble rounded-card p-4 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-extrabold text-gray-900 tabular-nums" dir="ltr">{formatMoney(c.amount, c.currency)}</p>
          {c.sellerName && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
              <UserRound className="w-3.5 h-3.5 text-gray-400" /> {c.sellerName}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full', meta.cls)}>{meta.label}</span>
          <SettlementChip settlementId={c.settlementId} />
        </div>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400">
        <CalendarDays className="w-3.5 h-3.5" /> {formatDateTime(c.collectedAt)}
      </p>
      {c.note && <p className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{c.note}</p>}
      {c.verificationStatus === 'REJECTED' && c.rejectionReason && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{c.rejectionReason}</p>
      )}

      <div className="mt-3">
        <ContractDoc
          url={c.receiptUrl ?? null}
          label="عرض الإيصال"
          emptyLabel="لا يوجد إيصال"
          expiredLabel="انتهت صلاحية الرابط، حدّث الصفحة."
          alt="إيصال التحصيل"
          dir="ltr"
        />
      </div>

      {pending && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
          <button onClick={onVerify} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} تحقّق
          </button>
          <button onClick={onReject} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold disabled:opacity-60 transition-colors">
            <XCircle className="w-4 h-4" /> {UI_AR.reject}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function AccountingAgentCollectionsPage() {
  const params = useParams<{ agentId: string }>();
  const agentId = params?.agentId;

  const [mounted, setMounted] = useState(false);
  const [status, setStatus]   = useState<CollectionVerificationStatus | 'ALL'>('PENDING_VERIFICATION');
  const [settled, setSettled] = useState<'ALL' | 'true' | 'false'>('ALL');
  const [rows, setRows]       = useState<AgentCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [busyId, setBusyId]   = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AgentCollection | null>(null);
  const [agent, setAgent] = useState<AgentIdentity | null>(null);

  // Initial filter off the URL (no useSearchParams → no Suspense boundary). Audit
  // entry passes ?status=all → land on "all"; bare entry (triage) stays pending.
  useEffect(() => {
    setStatus(initialStatusFromParam(new URLSearchParams(window.location.search).get('status')));
    setMounted(true);
  }, []);

  const load = useCallback(() => {
    if (!agentId || !mounted) return;
    setLoading(true); setError(false);
    accountingService.agentCollections(agentId, {
      status: status === 'ALL' ? undefined : status,
      settled: settled === 'ALL' ? undefined : settled === 'true',
      page: 1,
      limit: 100,
    })
      .then((res) => {
        setRows(res.data);
        if (res.meta.agent) setAgent(res.meta.agent);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [agentId, status, settled, mounted]);

  useEffect(() => { load(); }, [load]);

  const verify = async (c: AgentCollection) => {
    setBusyId(c.id);
    try {
      await accountingService.verifyCollection(c.id);
      toast.success('تم التحقق من التحصيل.');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'تعذّر التحقق.');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (c: AgentCollection, reason: string) => {
    setBusyId(c.id);
    try {
      await accountingService.rejectCollection(c.id, reason);
      toast.success('تم رفض التحصيل.');
      setRejecting(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'تعذّر الرفض.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      {rejecting && (
        <RejectModal onClose={() => setRejecting(null)} onConfirm={(reason) => reject(rejecting, reason)} />
      )}

      <Link href="/accounting/verification" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft className="w-4 h-4" /> تحقّق التحصيلات
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
          <UserRound className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{agent?.agentName || 'مندوب'}</h1>
          {agent?.agentPhone ? (
            <p className="text-sm text-gray-500 flex items-center gap-1.5" dir="ltr">
              <Phone className="w-3.5 h-3.5 shrink-0" /> {agent.agentPhone}
            </p>
          ) : (
            <p className="text-sm text-gray-500">إيصالات التحصيل — تحقّق / رفض.</p>
          )}
          {agent?.agentCode && <div className="mt-1"><CopyableId id={agent.agentCode} /></div>}
        </div>
      </div>

      {/* Filters: verification status × settlement state (combined server-side) */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex gap-1 bg-white shadow-pebble rounded-card p-1 w-fit overflow-x-auto max-w-full">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatus(value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                status === value ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white shadow-pebble rounded-card p-1 w-fit overflow-x-auto max-w-full">
          {SETTLED_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSettled(value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                settled === value ? 'bg-slate-700 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-white rounded-card shadow-pebble animate-pulse h-56" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <AlertTriangle className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">تعذّر تحميل التحصيلات.</p>
          <button onClick={load} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline">{UI_AR.retry}</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Inbox className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">لا تحصيلات بهذه الحالة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((c) => (
            <CollectionCard
              key={c.id}
              c={c}
              busy={busyId === c.id}
              onVerify={() => verify(c)}
              onReject={() => setRejecting(c)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
