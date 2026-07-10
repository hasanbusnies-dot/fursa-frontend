'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftRight, Loader2, X, AlertTriangle, Inbox, CheckCircle2, XCircle,
  UserRound, Phone, Mail, CalendarDays, Hash, Banknote,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminNav } from '@/components/admin/AdminNav';
import { useAuthStore } from '@/store/auth.store';
import {
  adminTransfersService,
  type AdminTransferRow,
} from '@/services/wallet-transfers.service';
import { ContractDoc } from '@/components/stores/ContractDoc';
import { formatMoney } from '@/lib/money';
import { TRANSFER_METHOD_AR as METHOD_LABEL, UI_AR } from '@/lib/staff-labels';

function formatDateTime(s: string): string {
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleString('ar', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function userLabel(u: AdminTransferRow['user']): string {
  return u?.name ?? u?.phone ?? u?.email ?? '—';
}

// ── Reject modal ──────────────────────────────────────────────────────────────────

function RejectModal({
  row, onClose, onConfirm,
}: {
  row: AdminTransferRow;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">رفض الحوالة</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">سبب الرفض</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          autoFocus
          placeholder="وضّح سبب الرفض…"
          className="block w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-colors resize-none"
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {UI_AR.cancel}
          </button>
          <button
            onClick={submit}
            disabled={saving || !reason.trim()}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {UI_AR.reject}
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
  row: AdminTransferRow;
  onConfirm: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  return (
    <div className="bg-white shadow-pebble rounded-card p-4 flex flex-col">
      {/* Amount + method — the matching anchors, made prominent */}
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
        <div className="text-end">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
            بانتظار الاعتماد
          </span>
        </div>
      </div>

      {/* Reference code — the key match against the real account note */}
      <div className="mt-3 rounded-xl border-2 border-blue-200 bg-blue-50 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1">
          <Hash className="w-3 h-3" />
          الرمز المرجعي
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
        {row.user?.email && (
          <p className="flex items-center gap-1.5" dir="ltr">
            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            {row.user.email}
          </p>
        )}
        <p className="flex items-center gap-1.5" dir="ltr">
          <Banknote className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {row.receivingAccount}
        </p>
        <p className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {formatDateTime(row.claimedAt)}
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
          label="عرض الإيصال"
          emptyLabel="لا يوجد إيصال"
          expiredLabel="انتهت صلاحية الرابط، حدّث الصفحة."
          alt={`إيصال ${row.referenceCode}`}
          dir="ltr"
        />
      </div>

      {/* Actions */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
        <button
          onClick={onConfirm}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {UI_AR.approve}
        </button>
        <button
          onClick={onReject}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold disabled:opacity-60 transition-colors"
        >
          <XCircle className="w-4 h-4" />
          {UI_AR.reject}
        </button>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function AdminTransfersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  const [rows, setRows]       = useState<AdminTransferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [busyId, setBusyId]   = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AdminTransferRow | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || user?.userType !== 'ADMIN') router.replace('/admin/login');
  }, [mounted, isAuthenticated, user, router]);

  const load = useCallback(() => {
    setLoading(true); setError(false);
    adminTransfersService.list('PENDING_VERIFICATION')
      .then(setRows)
      .catch((err) => { console.error('[AdminTransfers] fetch error:', err); setError(true); setRows([]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!mounted || user?.userType !== 'ADMIN') return;
    load();
  }, [mounted, user, load]);

  const confirm = async (row: AdminTransferRow) => {
    setBusyId(row.id);
    try {
      const res = await adminTransfersService.confirm(row.id);
      const bal = res.balanceAfter != null ? ` الرصيد الجديد: ${formatMoney(res.balanceAfter, res.currency ?? row.currency ?? 'SYP')}` : '';
      toast.success(`تم اعتماد الحوالة وإضافة الرصيد إلى المحفظة.${bal}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : UI_AR.actionFailed);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (row: AdminTransferRow, reason: string) => {
    setBusyId(row.id);
    try {
      await adminTransfersService.reject(row.id, reason);
      toast.success('تم رفض الحوالة.');
      setRejecting(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : UI_AR.actionFailed);
    } finally {
      setBusyId(null);
    }
  };

  if (!mounted || !isAuthenticated || user?.userType !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-100">
      {rejecting && (
        <RejectModal
          row={rejecting}
          onClose={() => setRejecting(null)}
          onConfirm={(reason) => reject(rejecting, reason)}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-20 py-8">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-sm">
            <ArrowLeftRight className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">اعتماد الحوالات</h1>
            <p className="text-sm text-gray-500">طابِق الرمز المرجعي والإيصال مع الحساب الفعلي ثم اعتمِد.</p>
          </div>
        </div>

        <AdminNav />

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-card shadow-pebble animate-pulse h-80" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <AlertTriangle className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">تعذّر تحميل الحوالات.</p>
            <button onClick={load} className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline">
              {UI_AR.retry}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <Inbox className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">لا توجد حوالات بانتظار الاعتماد.</p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
