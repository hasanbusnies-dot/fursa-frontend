'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeftRight, Loader2, X, AlertTriangle, Inbox, CheckCircle2, XCircle,
  UserRound, Phone, CalendarDays, Hash, Banknote, ShieldCheck,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  accountingTransfersService,
  type AccountingTransferRow,
  type TransferMethod,
  type TransferStatus,
} from '@/services/wallet-transfers.service';
import type { PageMeta } from '@/services/stores.service';
import { ContractDoc } from '@/components/stores/ContractDoc';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

const METHOD_LABEL: Record<TransferMethod, string> = {
  SHAM_CASH: 'Sham Cash', MTN_CASH: 'MTN Cash', SYRIATEL_CASH: 'Syriatel Cash',
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING_VERIFICATION: { label: 'Onay bekliyor', cls: 'bg-amber-100 text-amber-800' },
  CONFIRMED:            { label: 'Onaylandı',     cls: 'bg-green-100 text-green-700' },
  REJECTED:             { label: 'Reddedildi',    cls: 'bg-red-100 text-red-700'     },
  INITIATED:            { label: 'Başlatıldı',    cls: 'bg-gray-100 text-gray-500'   },
};

const FILTERS: { value: TransferStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING_VERIFICATION', label: 'Bekleyen' },
  { value: 'CONFIRMED',            label: 'Onaylanan' },
  { value: 'REJECTED',             label: 'Reddedilen' },
  { value: 'ALL',                  label: 'Tümü' },
];

function formatDateTime(s?: string | null): string {
  if (!s) return '—';
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function userLabel(u: AccountingTransferRow['user']): string {
  return u?.name ?? u?.phone ?? '—';
}

// ── Reject modal ──────────────────────────────────────────────────────────────────

function RejectModal({
  onClose, onConfirm,
}: {
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const r = reason.trim();
    if (!r) { toast.error('Lütfen bir red gerekçesi girin.'); return; }
    setSaving(true);
    try { await onConfirm(r); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Transferi Reddet</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Red Gerekçesi</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          autoFocus
          placeholder="Neden reddedildiğini açıklayın…"
          className="block w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-colors resize-none"
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={submit}
            disabled={saving || !reason.trim()}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Reddet
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Transfer card ───────────────────────────────────────────────────────────────────

function TransferCard({
  row, onConfirm, onReject, busy,
}: {
  row: AccountingTransferRow;
  onConfirm: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const meta = STATUS_META[row.status] ?? { label: row.status, cls: 'bg-gray-100 text-gray-500' };
  const pending = row.status === 'PENDING_VERIFICATION';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col">
      {/* Amount + method */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-extrabold text-gray-900 leading-none" dir="ltr">
            {formatMoney(row.amount, row.currency ?? 'SYP')}
          </p>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
            <Banknote className="w-3.5 h-3.5 text-gray-400" />
            {METHOD_LABEL[row.method] ?? row.method}
          </p>
        </div>
        <span className={cn('shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full', meta.cls)}>
          {meta.label}
        </span>
      </div>

      {/* Reference code — the key match against the real account note */}
      <div className="mt-3 rounded-xl border-2 border-blue-200 bg-blue-50 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1">
          <Hash className="w-3 h-3" />
          Referans Kodu
        </p>
        <p className="text-lg font-extrabold tracking-widest text-gray-900" dir="ltr">{row.referenceCode}</p>
      </div>

      {/* Meta */}
      <div className="mt-3 space-y-1.5 text-xs text-gray-600">
        <p className="flex items-center gap-1.5">
          <UserRound className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="font-medium text-gray-800">{userLabel(row.user)}</span>
        </p>
        {row.user?.phone && (
          <p className="flex items-center gap-1.5" dir="ltr">
            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            {row.user.phone}
          </p>
        )}
        <p className="flex items-center gap-1.5" dir="ltr">
          <Banknote className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {row.receivingAccount}
        </p>
        <p className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {formatDateTime(row.createdAt)}
        </p>
      </div>

      {/* User note */}
      {row.userReference && (
        <p className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
          {row.userReference}
        </p>
      )}

      {/* Proof screenshot */}
      <div className="mt-3">
        <ContractDoc
          url={row.proofUrl ?? null}
          label="Dekontu Görüntüle"
          emptyLabel="Dekont yok"
          expiredLabel="Bağlantının süresi doldu, sayfayı yenileyin."
          alt={`${row.referenceCode} dekontu`}
          dir="ltr"
        />
      </div>

      {/* Rejection reason (rejected rows) */}
      {row.status === 'REJECTED' && row.rejectionReason && (
        <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 leading-relaxed">
          {row.rejectionReason}
        </p>
      )}

      {/* Audit: who confirmed/rejected + when (resolved rows) */}
      {!pending && (row.confirmedByName || row.confirmedAt) && (
        <p className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-[11px] text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          {row.confirmedByName ?? 'Personel'} · {formatDateTime(row.confirmedAt)}
        </p>
      )}

      {/* Actions (pending only) */}
      {pending && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Onayla
          </button>
          <button
            onClick={onReject}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold disabled:opacity-60 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Reddet
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function AccountingTransfersPage() {
  const [status, setStatus]   = useState<TransferStatus | 'ALL'>('PENDING_VERIFICATION');
  const [page, setPage]       = useState(1);
  const [rows, setRows]       = useState<AccountingTransferRow[]>([]);
  const [meta, setMeta]       = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [busyId, setBusyId]   = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AccountingTransferRow | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError(false);
    accountingTransfersService.list(status, page, 20)
      .then((res) => { setRows(res.data); setMeta(res.meta); })
      .catch(() => { setError(true); setRows([]); setMeta(null); })
      .finally(() => setLoading(false));
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  const onFilter = (v: TransferStatus | 'ALL') => { setStatus(v); setPage(1); };

  const confirm = async (row: AccountingTransferRow) => {
    setBusyId(row.id);
    try {
      const res = await accountingTransfersService.confirm(row.id);
      const bal = res.balanceAfter != null
        ? ` Yeni bakiye: ${formatMoney(res.balanceAfter, res.currency ?? row.currency ?? 'SYP')}`
        : '';
      toast.success(`Transfer onaylandı, cüzdan kreditlendi.${bal}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'İşlem başarısız.');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (row: AccountingTransferRow, reason: string) => {
    setBusyId(row.id);
    try {
      await accountingTransfersService.reject(row.id, reason);
      toast.success('Transfer reddedildi.');
      setRejecting(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'İşlem başarısız.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      {rejecting && (
        <RejectModal
          onClose={() => setRejecting(null)}
          onConfirm={(reason) => reject(rejecting, reason)}
        />
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-sm">
          <ArrowLeftRight className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transfer Onayları</h1>
          <p className="text-sm text-gray-500">Referans kodu + dekontu gerçek hesapla eşleştirip onaylayın.</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit overflow-x-auto max-w-full">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onFilter(value)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0',
              status === value ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 animate-pulse h-80" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <AlertTriangle className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Transferler yüklenemedi.</p>
          <button onClick={load} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline">
            Tekrar dene
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Inbox className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            {status === 'PENDING_VERIFICATION' ? 'Onay bekleyen transfer yok.' : 'Bu filtrede transfer yok.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((r) => (
              <TransferCard
                key={r.id}
                row={r}
                busy={busyId === r.id}
                onConfirm={() => confirm(r)}
                onReject={() => setRejecting(r)}
              />
            ))}
          </div>

          {meta && (meta.hasPrevPage || meta.hasNextPage) && (
            <div className="flex items-center justify-between mt-6">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!meta.hasPrevPage} className="flex items-center gap-1 text-sm font-semibold text-gray-600 disabled:opacity-40 hover:text-gray-900 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Önceki
              </button>
              <span className="text-xs text-gray-400">Sayfa {meta.page}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={!meta.hasNextPage} className="flex items-center gap-1 text-sm font-semibold text-gray-600 disabled:opacity-40 hover:text-gray-900 transition-colors">
                Sonraki <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
