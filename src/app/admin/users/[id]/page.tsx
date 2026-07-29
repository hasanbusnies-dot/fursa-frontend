'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users, ChevronRight, AlertTriangle, Phone, Mail, CalendarDays, BadgeCheck,
  ShieldX, Ban, Store, Wallet, LayoutList, UserCog, History, Loader2, Trash2,
  CheckCircle2, Clock, ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminNav } from '@/components/admin/AdminNav';
import { UserStatusChip } from '@/components/admin/UserStatusChip';
import { SuspendModal, ReactivateModal, DeleteUserModal } from '@/components/admin/UserModerationModals';
import { useAdminAuthStore } from '@/store/auth.store';
import {
  adminUsersService,
  canModerate,
  displayEmailOf,
  displayPhoneOf,
  isDeleted,
  type AdminUserDetail,
} from '@/services/admin-users.service';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import {
  AGENT_STATUS_AR, LISTING_STATUS_AR, STORE_STATUS_AR, USER_TYPE_AR,
  WALLET_STATUS_AR, UI_AR,
} from '@/lib/staff-labels';

function formatDate(d?: string | null) {
  if (!d) return '—';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString('ar', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateTime(d?: string | null) {
  if (!d) return '—';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  return `${formatDate(d)} — ${t.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}`;
}

const ACTION_AR: Record<string, string> = {
  SUSPEND:     'إيقاف',
  BAN:         'حظر',
  REACTIVATE:  'إعادة تفعيل',
  SOFT_DELETE: 'حذف',
  RESTORE:     'استعادة',
};

// ── Small presentational pieces ───────────────────────────────────────────────────

function Card({ title, icon: Icon, children, className }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-white shadow-pebble rounded-card p-5', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 text-end min-w-0 break-words">{children}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────────

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { user: admin, isAuthenticated } = useAdminAuthStore();

  const [mounted, setMounted]   = useState(false);
  const [user, setUser]         = useState<AdminUserDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [busy, setBusy]         = useState(false);
  const [suspending, setSuspending]   = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || admin?.userType !== 'ADMIN') {
      router.replace('/admin/login');
    }
  }, [mounted, isAuthenticated, admin, router]);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    adminUsersService.getUser(id)
      .then(setUser)
      .catch((err) => {
        console.error('[AdminUserDetail] fetch error:', err);
        setError(true);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!mounted || admin?.userType !== 'ADMIN') return;
    load();
  }, [mounted, admin, load]);

  // ── Actions ─────────────────────────────────────────────────────────────────────
  // Every one refetches rather than patching local state: the mutation response is the
  // user row only, while the cascade also moved the store, the wallet and the session
  // count shown on this page.

  const suspend = async (reason: string) => {
    if (!user) return;
    setBusy(true);
    try {
      await adminUsersService.updateStatus(user.id, { status: 'SUSPENDED', reason });
      toast.success('تم إيقاف الحساب.');
      setSuspending(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : UI_AR.actionFailed);
    } finally {
      setBusy(false);
    }
  };

  const reactivate = async (reason?: string) => {
    if (!user) return;
    setBusy(true);
    try {
      await adminUsersService.updateStatus(user.id, { status: 'ACTIVE', reason });
      toast.success(isDeleted(user) ? 'تمت استعادة الحساب.' : 'تمت إعادة تفعيل الحساب.');
      setReactivating(false);
      load();
    } catch (err) {
      // A restore 409s when the freed phone/email now belongs to somebody else — the
      // server message names the clashing account, so surface it verbatim.
      toast.error(err instanceof Error ? err.message : UI_AR.actionFailed);
    } finally {
      setBusy(false);
    }
  };

  const softDelete = async (reason: string) => {
    if (!user) return;
    setBusy(true);
    try {
      const res = await adminUsersService.softDelete(user.id, reason);
      toast.success(`تم حذف الحساب. تم تحرير الرقم ${res.freedIdentifiers.phone}.`);
      setDeleting(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : UI_AR.actionFailed);
    } finally {
      setBusy(false);
    }
  };

  if (!mounted || !isAuthenticated || admin?.userType !== 'ADMIN') return null;

  const phone = user ? displayPhoneOf(user) : null;
  const email = user ? displayEmailOf(user) : null;
  const dead  = user ? isDeleted(user) : false;
  const frozen = user ? (user.status === 'SUSPENDED' || user.status === 'BANNED') : false;
  // Mirrors the server guard (403 CANNOT_MODERATE_ADMIN / CANNOT_MODERATE_SELF). The
  // server check is the control; hiding the buttons is the courtesy.
  const moderatable = user ? canModerate(user, admin?.id) : false;

  const listingEntries = user ? Object.entries(user.listingCounts).filter(([, n]) => n > 0) : [];
  const totalListings = listingEntries.reduce((s, [, n]) => s + n, 0);

  return (
    <div className="min-h-screen bg-gray-100">
      {user && suspending && (
        <SuspendModal user={user} onClose={() => setSuspending(false)} onConfirm={suspend} />
      )}
      {user && reactivating && (
        <ReactivateModal user={user} onClose={() => setReactivating(false)} onConfirm={reactivate} />
      )}
      {user && deleting && (
        <DeleteUserModal user={user} onClose={() => setDeleting(false)} onConfirm={softDelete} />
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-20 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center shadow-sm">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {user?.displayName ?? (loading ? '…' : 'تفاصيل الحساب')}
            </h1>
            <p className="text-sm text-gray-500">مراجعة الحساب وإجراءات الإشراف.</p>
          </div>
        </div>

        <AdminNav />

        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 mb-5 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          <ChevronRight className="w-4 h-4" />
          العودة إلى المستخدمين
        </Link>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-card shadow-pebble animate-pulse h-56" />
            ))}
          </div>
        ) : error || !user ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <AlertTriangle className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">{UI_AR.loadFailed}</p>
            <button onClick={load} className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline">
              {UI_AR.retry}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Deleted banner — the loudest thing on the page when it applies. */}
            {dead && (
              <div className="flex items-start gap-2 rounded-card bg-gray-800 text-white p-4">
                <Trash2 className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold">هذا الحساب محذوف.</p>
                  <p className="text-gray-300 text-xs mt-1">
                    حُذف في {formatDateTime(user.deletedAt)} — تم تحرير رقم الهاتف والبريد، وأُخفيت الإعلانات.
                    البيانات والسجلات المحاسبية محفوظة، ويمكن استعادة الحساب.
                  </p>
                </div>
              </div>
            )}

            {/* Current status + reason */}
            <Card title="الحالة" icon={ShieldAlert}>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <UserStatusChip user={user} size="lg" />
                <span className="text-xs text-gray-500">{USER_TYPE_AR[user.userType] ?? user.userType}</span>
                {user.isVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                    <BadgeCheck className="w-3 h-3" />
                    موثّق
                  </span>
                )}
              </div>

              {user.statusReason && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 min-w-0">
                    <p className="font-bold mb-0.5">سبب الإجراء</p>
                    <p className="break-words">{user.statusReason}</p>
                  </div>
                </div>
              )}

              <Row label="آخر تغيير">{formatDateTime(user.statusChangedAt)}</Row>
              {user.statusChangedBy && (
                <Row label="بواسطة">{user.statusChangedBy.name ?? user.statusChangedBy.phone}</Row>
              )}
              <Row label="الجلسات النشطة">
                {user.activeSessions > 0
                  ? <span className="font-semibold">{user.activeSessions}</span>
                  : <span className="text-gray-400">لا توجد</span>}
              </Row>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Account info */}
              <Card title="معلومات الحساب" icon={Users}>
                <Row label="الاسم">{user.displayName ?? <span className="text-gray-400">بلا اسم</span>}</Row>
                <Row label="الهاتف">
                  {phone
                    ? <span dir="ltr" className="font-mono">{phone}</span>
                    : <span className="text-gray-400">محرَّر (محذوف)</span>}
                </Row>
                <Row label="البريد">
                  {email
                    ? <span dir="ltr" className="break-all">{email}</span>
                    : <span className="text-gray-400">{dead ? 'محرَّر (محذوف)' : '—'}</span>}
                </Row>
                <Row label="النوع">{USER_TYPE_AR[user.userType] ?? user.userType}</Row>
                <Row label="تاريخ الانضمام">{formatDate(user.createdAt)}</Row>
                <Row label="آخر دخول">{formatDateTime(user.lastLoginAt)}</Row>
              </Card>

              {/* Listings */}
              <Card title="الإعلانات" icon={LayoutList}>
                {totalListings === 0 ? (
                  <p className="text-sm text-gray-400 py-2">لا توجد إعلانات.</p>
                ) : (
                  <>
                    {listingEntries.map(([status, n]) => (
                      <Row key={status} label={LISTING_STATUS_AR[status] ?? status}>{n}</Row>
                    ))}
                    <Row label="الإجمالي"><span className="font-bold">{totalListings}</span></Row>
                  </>
                )}
                <Link
                  href="/admin/listings"
                  className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  إدارة الإعلانات
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </Link>
              </Card>

              {/* Store (corporate) */}
              {user.store && (
                <Card title="المتجر" icon={Store}>
                  <Row label="الاسم">{user.store.name}</Row>
                  <Row label="الحالة">{STORE_STATUS_AR[user.store.status] ?? user.store.status}</Row>
                  <Link
                    href={`/admin/stores/${user.store.id}`}
                    className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    تفاصيل المتجر
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </Link>
                </Card>
              )}

              {/* Wallet — status moves, balance never does. */}
              {user.wallet && (
                <Card title="المحفظة" icon={Wallet}>
                  <Row label="الحالة">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full',
                      user.wallet.status === 'FROZEN' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700',
                    )}>
                      {WALLET_STATUS_AR[user.wallet.status] ?? user.wallet.status}
                    </span>
                  </Row>
                  {user.wallet.balances.length === 0 ? (
                    <Row label="الرصيد"><span className="text-gray-400">0</span></Row>
                  ) : (
                    user.wallet.balances.map((b) => (
                      <Row key={b.currency} label={`الرصيد (${b.currency})`}>
                        <span className="font-semibold">{formatMoney(b.balance, b.currency)}</span>
                      </Row>
                    ))
                  )}
                  <p className="mt-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                    الرصيد محفوظ — التجميد يمنع الإنفاق ولا يمسّ الرصيد.
                  </p>
                </Card>
              )}

              {/* Field agent — the SECOND switch */}
              {user.agentProfile && (
                <Card title="حساب المندوب" icon={UserCog} className="md:col-span-2">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">حالة الحساب</p>
                      <UserStatusChip user={user} />
                      <p className="mt-1.5 text-[11px] text-gray-400">تتحكم بتسجيل الدخول.</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">حالة دور المندوب</p>
                      <span className={cn(
                        'inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full',
                        user.agentProfile.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-800',
                      )}>
                        {user.agentProfile.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                        {AGENT_STATUS_AR[user.agentProfile.status] ?? user.agentProfile.status}
                      </span>
                      <p className="mt-1.5 text-[11px] text-gray-400">تتحكم بصلاحيات العمل كمندوب.</p>
                    </div>
                  </div>

                  <Row label="المنطقة">{user.agentProfile.region ?? '—'}</Row>
                  <Row label="تاريخ التعيين">{formatDate(user.agentProfile.hiredAt)}</Row>

                  {/* Two independent switches, and only the first one is writable from here:
                      no endpoint updates AgentProfile.status. Saying so prevents an admin
                      reactivating an agent, seeing them still unable to work, and reading it
                      as a bug in this screen. */}
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-gray-50 border border-gray-200 p-3">
                    <AlertTriangle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-600">
                      الحالتان مستقلتان: إعادة تفعيل الحساب لا تُغيّر حالة دور المندوب.
                      لا يمكن تعديل حالة الدور من هذه الشاشة حالياً.
                    </p>
                  </div>
                </Card>
              )}
            </div>

            {/* Moderation history */}
            {user.statusHistory.length > 0 && (
              <Card title="سجل الإجراءات" icon={History}>
                <div className="space-y-3">
                  {user.statusHistory.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-semibold text-gray-900">{ACTION_AR[h.action] ?? h.action}</span>
                          <span className="text-xs text-gray-400">{formatDateTime(h.createdAt)}</span>
                        </div>
                        {h.reason && <p className="mt-0.5 text-xs text-gray-600 break-words">{h.reason}</p>}
                        {h.actor && (
                          <p className="mt-0.5 text-[11px] text-gray-400">بواسطة {h.actor.name ?? h.actor.phone}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Actions */}
            <Card title="إجراءات الإشراف" icon={ShieldX}>
              {!moderatable ? (
                <div className="flex items-start gap-2 rounded-xl bg-gray-50 border border-gray-200 p-3">
                  <AlertTriangle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600">
                    {user.userType === 'ADMIN'
                      ? 'لا يمكن إيقاف أو حذف حسابات المدراء.'
                      : 'لا يمكنك اتخاذ إجراء على حسابك الخاص.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {frozen || dead ? (
                    <button
                      onClick={() => setReactivating(true)}
                      disabled={busy}
                      className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {dead ? 'استعادة الحساب' : 'إعادة تفعيل الحساب'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setSuspending(true)}
                      disabled={busy}
                      className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
                    >
                      <Ban className="w-4 h-4" />
                      إيقاف الحساب
                    </button>
                  )}

                  {!dead && (
                    <button
                      onClick={() => setDeleting(true)}
                      disabled={busy}
                      className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold disabled:opacity-60 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف الحساب
                    </button>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
