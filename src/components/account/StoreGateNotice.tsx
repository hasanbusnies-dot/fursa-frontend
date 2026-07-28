'use client';

import Link from 'next/link';
import { Clock, XCircle, Ban, Inbox, Lock } from 'lucide-react';
import { useStoreGate, type StoreGate } from '@/store/store-gate.store';
import { cn } from '@/lib/utils';

/**
 * The «قيد المراجعة» lock, in one place.
 *
 * Visual parity with the PENDING card that /account/store has always shown — a business
 * under review should see the SAME amber card whether it lands on the store page, the
 * wallet, or the add-listing route. Copy is the only thing that varies per surface.
 */

/** Which surface the user was trying to reach — drives the second line only. */
export type GateSurface = 'store' | 'listing' | 'wallet' | 'dopings' | 'generic';

const SURFACE_PENDING_NOTE: Record<GateSurface, string> = {
  store:    'ستتمكن من إدارة متجرك فور اعتماد حسابك من الإدارة.',
  listing:  'يمكنك إضافة إعلاناتك فور اعتماد حساب نشاطك من الإدارة.',
  wallet:   'تُفتح المحفظة وعمليات الشحن فور اعتماد حساب نشاطك من الإدارة.',
  dopings:  'تُفتح خدمات التعزيز فور اعتماد حساب نشاطك من الإدارة.',
  generic:  'تُفتح أقسام المتجر وإضافة الإعلانات والمحفظة فور اعتماد حسابك.',
};

interface Props {
  gate: StoreGate;
  surface?: GateSurface;
  className?: string;
}

/**
 * Renders the reason this surface is locked. Returns null when the account is not
 * locked — callers can render it unconditionally above their content.
 */
export function StoreGateNotice({ gate, surface = 'generic', className }: Props) {
  if (!gate.locked) return null;

  if (gate.storeStatus === 'REJECTED') {
    return (
      <div className={cn('rounded-2xl bg-red-50 border border-red-200 p-5', className)}>
        <div className="flex items-center gap-2 mb-2">
          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm font-bold text-red-800">تم رفض حساب نشاطك</p>
        </div>
        <p className="text-xs text-red-700 leading-relaxed">
          {gate.rejectionReason || 'لم تُذكر أسباب الرفض. يرجى التواصل مع الدعم لمزيد من التفاصيل.'}
        </p>
      </div>
    );
  }

  if (gate.storeStatus === 'SUSPENDED') {
    return (
      <div className={cn('rounded-2xl bg-gray-50 border border-gray-200 p-5 text-center', className)}>
        <Ban className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-bold text-gray-700">حساب نشاطك موقوف حالياً</p>
        <p className="text-xs text-gray-500 mt-1">تواصل مع الدعم لمعرفة التفاصيل.</p>
      </div>
    );
  }

  if (gate.noStore) {
    return (
      <div className={cn('rounded-2xl bg-gray-50 border border-gray-200 p-5 text-center', className)}>
        <Inbox className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-bold text-gray-700">لا يوجد نشاط تجاري مرتبط بحسابك</p>
        <p className="text-xs text-gray-500 mt-1">تواصل مع الدعم لاستكمال تسجيل نشاطك.</p>
      </div>
    );
  }

  // PENDING (and any unmapped status) — the common case.
  return (
    <div className={cn('rounded-2xl bg-amber-50 border border-amber-200 p-5 text-center', className)}>
      <Clock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
      <p className="text-sm font-bold text-amber-800">حسابك قيد المراجعة</p>
      <p className="text-xs text-amber-700 mt-1">{SURFACE_PENDING_NOTE[surface]}</p>
    </div>
  );
}

/**
 * Full-surface replacement for a locked page: the notice, centred, with a way back.
 * Use where the whole route is unusable (add-listing, wallet), as opposed to a banner
 * above still-usable content.
 */
export function StoreGateBlock({ surface = 'generic' }: { surface?: GateSurface }) {
  const gate = useStoreGate();

  if (gate.loading) {
    return (
      <div className="rounded-card bg-white shadow-pebble p-10">
        <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse mx-auto mb-3" />
        <div className="h-4 w-48 bg-gray-100 rounded animate-pulse mx-auto" />
      </div>
    );
  }

  if (!gate.locked) return null;

  return (
    <div className="rounded-card bg-white shadow-pebble p-6 sm:p-10">
      <div className="max-w-md mx-auto">
        <StoreGateNotice gate={gate} surface={surface} />
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2">
          <Link
            href="/account/store"
            className="w-full sm:w-auto text-center px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors"
          >
            حالة نشاطي
          </Link>
          <Link
            href="/account"
            className="w-full sm:w-auto text-center px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            العودة إلى حسابي
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Small inline «قيد المراجعة» chip for locked nav items. */
export function GateLockChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold',
        className,
      )}
    >
      <Lock className="w-2.5 h-2.5" />
      قيد المراجعة
    </span>
  );
}
