'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, Zap, Star, LayoutGrid, ArrowUp, Search,
  Flame, Type, RefreshCw, CheckCircle, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { dopingsService, type DopingType } from '@/services/dopings.service';
import { cn } from '@/lib/utils';

// ── Types & config ────────────────────────────────────────────────────────────

type DurationWeeks = 1 | 2 | 4;

interface DopingOption {
  type: DopingType | 'REFRESH_DATE';
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  /** true → show duration selector; false → one-time or fixed-duration */
  timed: boolean;
  basePrice: number;
  fixedDurationLabel?: string;
}

const DOPING_OPTIONS: DopingOption[] = [
  {
    type: 'HOMEPAGE',
    icon: Star,
    iconBg: 'bg-yellow-50',
    iconColor: 'text-yellow-500',
    title: 'واجهة الصفحة الرئيسية',
    description: 'اظهر للملايين على الصفحة الرئيسية.',
    timed: true,
    basePrice: 500,
  },
  {
    type: 'CATEGORY',
    icon: LayoutGrid,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    title: 'واجهة الفئة',
    description: 'أعلى واجهة في صفحة الفئة.',
    timed: true,
    basePrice: 300,
  },
  {
    type: 'TOP_OF_SEARCH',
    icon: ArrowUp,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-500',
    title: 'في أعلى القائمة',
    description: 'تصدر نتائج البحث دائماً.',
    timed: true,
    basePrice: 400,
  },
  {
    type: 'DETAILED_SEARCH',
    icon: Search,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-500',
    title: 'واجهة البحث المتقدم',
    description: 'ابرز في نتائج البحث المتقدم.',
    timed: true,
    basePrice: 250,
  },
  {
    type: 'URGENT',
    icon: Flame,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
    title: 'إعلان عاجل',
    description: "الفت الانتباه بشارة 'عاجل' الحمراء.",
    timed: false,
    basePrice: 150,
  },
  {
    type: 'HIGHLIGHT',
    icon: Type,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-500',
    title: 'خط عريض وإطار',
    description: 'ابرز في القائمة بإطار ملون.',
    timed: false,
    basePrice: 200,
  },
  {
    type: 'REFRESH_DATE',
    icon: RefreshCw,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-500',
    title: 'تحديث الإعلان',
    description: 'انقل إعلانك للأعلى بتحديث تاريخه.',
    timed: false,
    basePrice: 100,
  },
];

const DURATION_OPTIONS: { weeks: DurationWeeks; label: string; multiplier: number }[] = [
  { weeks: 1, label: 'أسبوع واحد', multiplier: 1 },
  { weeks: 2, label: 'أسبوعان',    multiplier: 1.8 },
  { weeks: 4, label: '4 أسابيع',   multiplier: 3.2 },
];

function calcPrice(option: DopingOption, weeks: DurationWeeks): number {
  if (!option.timed) return option.basePrice;
  const dur = DURATION_OPTIONS.find((d) => d.weeks === weeks)!;
  return Math.round(option.basePrice * dur.multiplier);
}

function durationSummaryLabel(option: DopingOption, weeks: DurationWeeks): string {
  if (option.fixedDurationLabel) return option.fixedDurationLabel;
  if (!option.timed)             return 'لمرة واحدة';
  const d = DURATION_OPTIONS.find((x) => x.weeks === weeks);
  return d?.label ?? `${weeks} أسابيع`;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
}

export function DopingPurchaseModal({ isOpen, onClose, listingId, listingTitle }: Props) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<DopingOption>(DOPING_OPTIONS[0]);
  const [duration, setDuration]         = useState<DurationWeeks>(1);
  const [purchasing, setPurchasing]     = useState(false);

  if (!isOpen) return null;

  const price = calcPrice(selectedType, duration);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      if (selectedType.type === 'REFRESH_DATE') {
        await dopingsService.refreshDate(listingId);
      } else {
        await dopingsService.apply(
          listingId,
          selectedType.type as DopingType,
          selectedType.timed ? duration : 1,
        );
      }
      toast.success(`تم تطبيق "${selectedType.title}" بنجاح!`);
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشلت العملية.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-none">شراء ترقية</h2>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-[280px]">{listingTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Boost type selector */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">اختر نوع الترقية</p>
            <div className="grid grid-cols-1 gap-2">
              {DOPING_OPTIONS.map((opt) => {
                const selected = selectedType.type === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setSelectedType(opt)}
                    className={cn(
                      'flex items-center gap-3 p-3.5 rounded-xl border-2 text-start transition-all',
                      selected
                        ? 'border-orange-400 bg-orange-50/60 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 bg-white',
                    )}
                  >
                    {/* Selection indicator — always occupies space, hidden when not selected */}
                    <CheckCircle
                      className={cn('w-4 h-4 shrink-0 transition-opacity', selected ? 'text-orange-500 opacity-100' : 'opacity-0')}
                    />

                    {/* Type icon */}
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', opt.iconBg)}>
                      <opt.icon className={cn(opt.iconColor)} style={{ width: 18, height: 18 }} />
                    </div>

                    {/* Title + description */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                        {opt.title}
                        {!opt.timed && !opt.fixedDurationLabel && (
                          <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                            لمرة واحدة
                          </span>
                        )}
                        {opt.fixedDurationLabel && (
                          <span className="text-[10px] font-bold bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded-full">
                            {opt.fixedDurationLabel}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                    </div>

                    {/* Price — aligned to the left edge (end in RTL) */}
                    <div className="shrink-0 text-end">
                      <p className="text-sm font-extrabold text-orange-600">{opt.basePrice} ل.س</p>
                      <p className="text-[10px] text-gray-400">
                        {opt.timed ? '/ أسبوع' : opt.fixedDurationLabel ? 'ثابت' : 'لمرة واحدة'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration selector */}
          {selectedType.timed && !selectedType.fixedDurationLabel && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                اختر المدة
              </p>
              <div className="grid grid-cols-3 gap-2">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d.weeks}
                    type="button"
                    onClick={() => setDuration(d.weeks)}
                    className={cn(
                      'py-3 rounded-xl border-2 text-center transition-all',
                      duration === d.weeks
                        ? 'border-orange-400 bg-orange-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300',
                    )}
                  >
                    <p className="text-sm font-bold text-gray-900">{d.label}</p>
                    <p className="text-xs text-orange-600 font-semibold mt-0.5">
                      {Math.round(selectedType.basePrice * d.multiplier)} ل.س
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Order summary */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">ملخص الطلب</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{selectedType.title}</span>
                <span className="font-semibold text-gray-900">
                  {durationSummaryLabel(selectedType, duration)}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between items-baseline">
                <span className="text-sm font-bold text-gray-800">المجموع</span>
                <span className="text-xl font-extrabold text-orange-600">{price} ل.س</span>
              </div>
            </div>
          </div>

          {/* Purchase button */}
          <button
            type="button"
            onClick={handlePurchase}
            disabled={purchasing}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-extrabold text-sm py-3.5 rounded-xl shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {purchasing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                جارٍ التنفيذ…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                اشترِ وأكّد — {price} ل.س
              </>
            )}
          </button>

          <p className="text-[11px] text-center text-gray-400 leading-relaxed">
            بشرائك لهذه الترقية، فإنك توافق على{' '}
            <a href="/vitrin" className="underline hover:text-gray-600">شروط استخدام الترقيات</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
