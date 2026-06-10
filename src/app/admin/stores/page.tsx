'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store, CheckCircle2, XCircle, Clock, Ban, AlertTriangle, Loader2, X,
  UserRound, UserCog, Phone, MapPin, CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminNav } from '@/components/admin/AdminNav';
import { useAuthStore } from '@/store/auth.store';
import {
  adminStoresService,
  contractUrlOf,
  ownerPendingOf,
  type Store as StoreModel,
  type StoreStatus,
} from '@/services/stores.service';
import { ContractDoc } from '@/components/stores/ContractDoc';
import { ResendSetupLinkButton } from '@/components/stores/ResendSetupLinkButton';
import { cn } from '@/lib/utils';

// ── Status + filter config ──────────────────────────────────────────────────────

const STATUS_META: Record<StoreStatus, { label: string; cls: string; Icon: React.ElementType }> = {
  PENDING:   { label: 'Beklemede', cls: 'bg-amber-100 text-amber-800', Icon: Clock        },
  APPROVED:  { label: 'Onaylandı', cls: 'bg-green-100 text-green-700', Icon: CheckCircle2 },
  REJECTED:  { label: 'Reddedildi',cls: 'bg-red-100 text-red-700',     Icon: XCircle      },
  SUSPENDED: { label: 'Askıda',    cls: 'bg-gray-200 text-gray-600',   Icon: Ban          },
};

// Filter chips — default to PENDING (the review queue).
const FILTERS: { value: StoreStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING',  label: 'Beklemede' },
  { value: 'APPROVED', label: 'Onaylandı' },
  { value: 'REJECTED', label: 'Reddedildi' },
  { value: 'ALL',      label: 'Tümü' },
];

function formatDate(d: string) {
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ownerNameOf(s: StoreModel) { return s.ownerName ?? s.owner?.name ?? '—'; }
function ownerPhoneOf(s: StoreModel) { return s.ownerPhone ?? s.owner?.phone ?? null; }
function agentOf(s: StoreModel) { return s.agent ?? s.registeredBy ?? null; }

// ── Reject modal ────────────────────────────────────────────────────────────────

function RejectModal({
  store, onClose, onConfirm,
}: {
  store: StoreModel;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const r = reason.trim();
    if (!r) { toast.error('Lütfen bir red gerekçesi girin.'); return; }
    setSaving(true);
    try {
      await onConfirm(r);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Mağazayı Reddet</h3>
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{store.name}</p>
            </div>
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

// ── Store card ──────────────────────────────────────────────────────────────────

function StoreCard({
  store, onApprove, onReject, busy,
}: {
  store: StoreModel;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const meta = STATUS_META[store.status] ?? STATUS_META.PENDING;
  const photo = contractUrlOf(store);
  const phone = ownerPhoneOf(store);
  const agent = agentOf(store);
  const isPending = store.status === 'PENDING';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-gray-900 truncate">{store.name}</h3>
          <span className={cn('shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full', meta.cls)}>
            <meta.Icon className="w-3 h-3" />
            {meta.label}
          </span>
        </div>

        <div className="mt-3 space-y-1.5 text-xs text-gray-600">
          <p className="flex items-center gap-1.5">
            <UserRound className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="font-medium text-gray-800">{ownerNameOf(store)}</span>
            <span className="text-gray-400">(Sahip)</span>
          </p>
          {phone && (
            <p className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              {phone}
            </p>
          )}
          {(store.address || store.city || store.governorate) && (
            <p className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
              <span>{[store.address, store.city, store.governorate].filter(Boolean).join(', ')}</span>
            </p>
          )}
          {agent && (
            <p className="flex items-center gap-1.5">
              <UserCog className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>{agent.name ?? agent.phone ?? agent.id}</span>
              <span className="text-gray-400">(Kayıt eden temsilci)</span>
            </p>
          )}
          <p className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            {formatDate(store.createdAt)}
          </p>
        </div>

        {/* Contract document — compact trigger → full-screen lightbox */}
        <div className="mt-3">
          <ContractDoc
            url={photo}
            label="Sözleşmeyi Görüntüle"
            emptyLabel="Sözleşme yok"
            expiredLabel="Bağlantının süresi doldu, sayfayı yenileyin."
            alt={`${store.name} sözleşmesi`}
            dir="ltr"
          />
        </div>

        {store.status === 'REJECTED' && store.rejectionReason && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-2.5">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{store.rejectionReason}</p>
          </div>
        )}

        {/* Owner-onboarding: resend the password-setup link while the owner is pending */}
        {ownerPendingOf(store) && (
          <div className="mt-3">
            <ResendSetupLinkButton
              onResend={() => adminStoresService.resendOwnerSetupLink(store.id)}
              className="w-full py-2 border-gray-200 text-gray-600 hover:bg-gray-50"
              labels={{
                idle:          'Kurulum bağlantısını yeniden gönder',
                sending:       'Gönderiliyor…',
                sent:          'Bağlantı gönderildi',
                success:       'Şifre belirleme bağlantısı sahibin e-postasına gönderildi.',
                alreadyActive: 'Sahip hesabını zaten etkinleştirmiş.',
                error:         'Bağlantı gönderilemedi. Tekrar deneyin.',
              }}
            />
          </div>
        )}

        {/* Actions — only when there's a decision to make */}
        {isPending && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
            <button
              onClick={onApprove}
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
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function AdminStoresPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  const [filter, setFilter]   = useState<StoreStatus | 'ALL'>('PENDING');
  const [stores, setStores]   = useState<StoreModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [busyId, setBusyId]   = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<StoreModel | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || user?.userType !== 'ADMIN') {
      router.replace('/admin/login');
    }
  }, [mounted, isAuthenticated, user, router]);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    adminStoresService
      .getStores({ status: filter === 'ALL' ? undefined : filter, page: 1, limit: 50 })
      .then((res) => setStores(res.data))
      .catch((err) => {
        console.error('[AdminStores] fetch error:', err);
        setError(true);
        setStores([]);
      })
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    if (!mounted || user?.userType !== 'ADMIN') return;
    load();
  }, [mounted, user, load]);

  const approve = async (store: StoreModel) => {
    setBusyId(store.id);
    try {
      await adminStoresService.updateStatus(store.id, { status: 'APPROVED' });
      toast.success(`"${store.name}" onaylandı.`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'İşlem başarısız.');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (store: StoreModel, reason: string) => {
    setBusyId(store.id);
    try {
      await adminStoresService.updateStatus(store.id, { status: 'REJECTED', rejectionReason: reason });
      toast.success(`"${store.name}" reddedildi.`);
      setRejecting(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'İşlem başarısız.');
    } finally {
      setBusyId(null);
    }
  };

  if (!mounted || !isAuthenticated || user?.userType !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-100">
      {rejecting && (
        <RejectModal
          store={rejecting}
          onClose={() => setRejecting(null)}
          onConfirm={(reason) => reject(rejecting, reason)}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-sm">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mağaza Onayları</h1>
            <p className="text-sm text-gray-500">Temsilcilerin kaydettiği mağazaları inceleyin ve onaylayın.</p>
          </div>
        </div>

        <AdminNav />

        {/* Status filter chips */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                filter === value ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 animate-pulse h-80" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <AlertTriangle className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Mağazalar yüklenemedi.</p>
            <button onClick={load} className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline">
              Tekrar dene
            </button>
          </div>
        ) : stores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <Store className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Kayıt bulunamadı.</p>
            <p className="text-xs text-gray-400">Bu durumda mağaza yok.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((s) => (
              <StoreCard
                key={s.id}
                store={s}
                busy={busyId === s.id}
                onApprove={() => approve(s)}
                onReject={() => setRejecting(s)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
