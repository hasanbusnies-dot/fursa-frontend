import {
  Star, LayoutGrid, ArrowUp, Search, Flame, Type, RefreshCw, Sparkles,
  type LucideIcon,
} from 'lucide-react';

// ── Shared doping visual identity ──────────────────────────────────────────────
// SINGLE source for the purchase modal, my-listings badges, the /account/dopings hub,
// and history receipts — so the four surfaces can't drift apart. Keys are the DB
// DopingPackage.type values. REFRESH exists only as a purchase receipt: it has no
// duration, so it never appears on any "active" surface (backend guarantees this;
// the frontend never re-derives it).

export interface DopingMeta {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  label: string;
}

export const DOPING_META: Record<string, DopingMeta> = {
  HOMEPAGE:        { icon: Star,       iconBg: 'bg-yellow-50', iconColor: 'text-yellow-500', label: 'واجهة الصفحة الرئيسية' },
  CATEGORY:        { icon: LayoutGrid, iconBg: 'bg-blue-50',   iconColor: 'text-blue-500',   label: 'واجهة الفئة' },
  TOP_OF_SEARCH:   { icon: ArrowUp,    iconBg: 'bg-indigo-50', iconColor: 'text-indigo-500', label: 'في أعلى القائمة' },
  DETAILED_SEARCH: { icon: Search,     iconBg: 'bg-purple-50', iconColor: 'text-purple-500', label: 'واجهة البحث المتقدم' },
  URGENT:          { icon: Flame,      iconBg: 'bg-red-50',    iconColor: 'text-red-500',    label: 'إعلان عاجل' },
  HIGHLIGHT:       { icon: Type,       iconBg: 'bg-orange-50', iconColor: 'text-orange-500', label: 'خط عريض وإطار' },
  REFRESH:         { icon: RefreshCw,  iconBg: 'bg-green-50',  iconColor: 'text-green-500',  label: 'تحديث تاريخ الإعلان' },
};

/** Tolerant lookup — an unknown/future type renders with its raw name, never crashes
 *  (same stance as the wallet ledger's unknown tx types). */
export function dopingMeta(type: string): DopingMeta {
  return DOPING_META[type] ?? { icon: Sparkles, iconBg: 'bg-gray-50', iconColor: 'text-gray-500', label: type };
}

const HOUR_MS = 3_600_000;

/** Future-tense Arabic countdown («يتبقى ٣ أيام») — timeAgoAr covers only the past. */
export function timeLeftAr(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'انتهى';
  const hours = Math.floor(ms / HOUR_MS);
  if (hours < 1) return 'أقل من ساعة';
  if (hours < 24) {
    if (hours === 1) return 'تتبقى ساعة';
    if (hours === 2) return 'تتبقى ساعتان';
    if (hours <= 10) return `تتبقى ${hours} ساعات`;
    return `تتبقى ${hours} ساعة`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) return 'يتبقى يوم';
  if (days === 2) return 'يتبقى يومان';
  if (days <= 10) return `تتبقى ${days} أيام`;
  return `يتبقى ${days} يوماً`;
}

/** True when the doping ends within 24h — drives the amber renewal-nudge accent. */
export function endsSoon(expiresAt: string): boolean {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return ms > 0 && ms < 24 * HOUR_MS;
}
