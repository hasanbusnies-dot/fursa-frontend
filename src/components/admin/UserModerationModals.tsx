'use client';

import { useState } from 'react';
import { AlertTriangle, Ban, CheckCircle2, Loader2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { UI_AR } from '@/lib/staff-labels';
import { displayPhoneOf, type AdminUserDetail } from '@/services/admin-users.service';

// Moderation dialogs for /admin/users/[id]. All three follow RejectModal in
// admin/stores/page.tsx: same overlay, same reason-required-before-submit gate, same
// spinner-on-confirm. The deviations are deliberate and noted where they occur.

function Shell({
  title, subtitle, tone, onClose, children,
}: {
  title: string;
  subtitle: string;
  tone: 'red' | 'green';
  onClose: () => void;
  children: React.ReactNode;
}) {
  const Icon = tone === 'red' ? Ban : CheckCircle2;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tone === 'red' ? 'bg-red-50' : 'bg-green-50'}`}>
              <Icon className={`w-4 h-4 ${tone === 'red' ? 'text-red-500' : 'text-green-600'}`} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900">{title}</h3>
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0">
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const textareaCls =
  'block w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 transition-colors resize-none';

/** Who we are acting on — name if the server resolved one, else the phone. */
function subjectOf(user: AdminUserDetail): string {
  return user.displayName ?? displayPhoneOf(user) ?? user.id;
}

// ── Suspend ───────────────────────────────────────────────────────────────────────

export function SuspendModal({
  user, onClose, onConfirm,
}: {
  user: AdminUserDetail;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const r = reason.trim();
    if (!r) { toast.error('الرجاء إدخال سبب الإيقاف.'); return; }
    setSaving(true);
    try { await onConfirm(r); } finally { setSaving(false); }
  };

  return (
    <Shell title="إيقاف الحساب" subtitle={subjectOf(user)} tone="red" onClose={onClose}>
      {/* The cascade is spelled out because it reaches beyond the account: an admin
          freezing a shop owner must know the storefront goes down with them. */}
      <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 space-y-1">
          <p className="font-bold">سيتم منع هذا المستخدم من تسجيل الدخول فوراً.</p>
          <p>سيتم إيقاف المتجر وتجميد المحفظة، وستُغلق جلساته الحالية.</p>
          <p className="text-amber-700">الرصيد محفوظ، والإجراء قابل للتراجع.</p>
        </div>
      </div>

      <label className="block text-xs font-semibold text-gray-700 mb-1.5">سبب الإيقاف</label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        autoFocus
        maxLength={500}
        placeholder="وضّح سبب الإيقاف…"
        className={`${textareaCls} focus:ring-red-200 focus:border-red-400`}
      />

      <div className="flex gap-2 mt-4">
        <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
          {UI_AR.cancel}
        </button>
        <button
          onClick={submit}
          disabled={saving || !reason.trim()}
          className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          إيقاف الحساب
        </button>
      </div>
    </Shell>
  );
}

// ── Reactivate / restore ──────────────────────────────────────────────────────────

export function ReactivateModal({
  user, onClose, onConfirm,
}: {
  user: AdminUserDetail;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  // PATCH status=ACTIVE on a soft-deleted account is a full RESTORE, not a plain
  // un-suspend: it clears deletedAt and puts the tombstoned phone/email back. Say so —
  // and warn that it can 409 if the freed number now belongs to somebody else.
  const restoring = !!user.deletedAt;

  const submit = async () => {
    setSaving(true);
    try { await onConfirm(reason.trim() || undefined); } finally { setSaving(false); }
  };

  return (
    <Shell
      title={restoring ? 'استعادة الحساب المحذوف' : 'إعادة تفعيل الحساب'}
      subtitle={subjectOf(user)}
      tone="green"
      onClose={onClose}
    >
      <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-3 text-xs text-green-800 space-y-1">
        <p className="font-bold">سيتمكّن المستخدم من تسجيل الدخول مجدداً.</p>
        <p>ستعود حالة المتجر والمحفظة إلى ما كانت عليه قبل الإيقاف.</p>
        {restoring && (
          <p className="text-green-700">سيُستعاد رقم الهاتف والبريد الأصليان — ما لم يكن الرقم قد سُجّل لحساب آخر بعد الحذف.</p>
        )}
      </div>

      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        السبب <span className="font-normal text-gray-400">(اختياري — يُحفظ في السجل)</span>
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="مثال: تم توضيح المخالفة مع المستخدم"
        className={`${textareaCls} focus:ring-green-200 focus:border-green-400`}
      />

      <div className="flex gap-2 mt-4">
        <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
          {UI_AR.cancel}
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {restoring ? 'استعادة' : 'إعادة التفعيل'}
        </button>
      </div>
    </Shell>
  );
}

// ── Soft delete ───────────────────────────────────────────────────────────────────

export function DeleteUserModal({
  user, onClose, onConfirm,
}: {
  user: AdminUserDetail;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Type-to-confirm the PHONE, not a fixed word: the phone is what the admin is already
  // looking at, so it defends against the real failure mode — deleting the wrong row.
  const realPhone = displayPhoneOf(user) ?? user.phone;
  const phoneMatches = phoneInput.trim() === realPhone;
  const ready = !!reason.trim() && phoneMatches;

  const submit = async () => {
    if (!ready) return;
    setSaving(true);
    try { await onConfirm(reason.trim()); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* Wider than the other two and red-bordered — this is the only irreversible-looking
          action in the panel, and it should not resemble a routine confirm. */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border-2 border-red-300 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4 text-red-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-red-700">حذف الحساب نهائياً</h3>
              <p className="text-xs text-gray-500 truncate max-w-[240px]">{subjectOf(user)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0">
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3">
          <p className="text-xs font-bold text-red-800 mb-2">سيتم حذف الحساب وإخفاء إعلاناته.</p>
          <ul className="text-xs text-red-700 space-y-1 list-disc list-inside marker:text-red-400">
            <li>الإعلانات ستُخفى</li>
            <li>المتجر سيُوقف</li>
            <li>سجلات المحاسبة تبقى محفوظة</li>
            <li>سيُحرَّر رقم الهاتف والبريد لإعادة الاستخدام</li>
          </ul>
        </div>

        <label className="block text-xs font-semibold text-gray-700 mb-1.5">سبب الحذف</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          autoFocus
          maxLength={500}
          placeholder="وضّح سبب الحذف…"
          className={`${textareaCls} focus:ring-red-200 focus:border-red-400`}
        />

        <label className="block text-xs font-semibold text-gray-700 mt-4 mb-1.5">
          للتأكيد، اكتب رقم هاتف المستخدم:
          <span dir="ltr" className="ms-1.5 font-mono font-bold text-gray-900">{realPhone}</span>
        </label>
        <input
          type="text"
          dir="ltr"
          inputMode="tel"
          autoComplete="off"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          placeholder={realPhone}
          className={`block w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 transition-colors ${
            phoneInput && !phoneMatches
              ? 'border-red-400 focus:ring-red-200'
              : phoneMatches
                ? 'border-green-400 focus:ring-green-200'
                : 'border-gray-300 focus:ring-red-200 focus:border-red-400'
          }`}
        />
        {phoneInput && !phoneMatches && (
          <p className="mt-1.5 text-xs text-red-600">الرقم غير مطابق.</p>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            {UI_AR.cancel}
          </button>
          <button
            onClick={submit}
            disabled={saving || !ready}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            حذف نهائياً
          </button>
        </div>
      </div>
    </div>
  );
}
