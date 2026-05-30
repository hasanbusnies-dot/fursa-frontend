'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, ChevronLeft, ChevronRight, MessageSquare,
  ImageOff, AlertCircle, Home, Phone, Calendar, Check, Settings,
  HelpCircle, Send, Tag, Store, BadgeCheck, ZoomIn, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { listingsService } from '@/services/listings.service';
import { messagesService } from '@/services/messages.service';
import { qaService, questionText, maskedAskerName, askerInitials, type Question } from '@/services/qa.service';
import { offersService } from '@/services/offers.service';
import { useAuthStore } from '@/store/auth.store';
import type { Listing } from '@/types';
import { TECH_SPECS } from '@/components/listings/wizard/schema';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { FavoriteSellerButton } from '@/components/listings/FavoriteSellerButton';
import { CompareButton } from '@/components/listings/CompareButton';
import { recommendationsService } from '@/services/recommendations.service';
import { useMobileTitle } from '@/components/layout/MobileTopBar';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(price: number, currency: 'SYP' | 'USD') {
  const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(price));
  return currency === 'USD' ? `$${n}` : `${n} ل.س`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ar-SY', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ── Damage report normalization ───────────────────────────────────────────────

type DamageNorm = 'original' | 'painted' | 'localPaint' | 'replaced';

const STATUS_NORM: Record<string, DamageNorm> = {
  ORIGINAL:      'original',
  PAINTED:       'painted',
  LOCAL_PAINTED: 'localPaint',
  REPLACED:      'replaced',
  original:      'original',
  painted:       'painted',
  localPaint:    'localPaint',
  replaced:      'replaced',
};

type DamageEntry = { status: DamageNorm; detail?: string };

function normalizeDamageReport(
  raw: Record<string, string | { status: string; detail?: string }>,
): Record<string, DamageEntry> {
  return Object.fromEntries(
    Object.entries(raw).map(([key, val]) => {
      const s      = typeof val === 'string' ? val : val?.status ?? 'ORIGINAL';
      const detail = typeof val === 'string' ? undefined : val?.detail || undefined;
      return [key, { status: STATUS_NORM[s] ?? 'original', detail }];
    }),
  );
}

// ── Tech specs grouping ───────────────────────────────────────────────────────

function groupTechSpecs(flat: string[]): { category: string; items: string[] }[] {
  const groups: { category: string; items: string[] }[] = [];
  for (const [cat, items] of Object.entries(TECH_SPECS)) {
    const matched = flat.filter((s) => (items as readonly string[]).includes(s));
    if (matched.length) groups.push({ category: cat, items: matched });
  }
  const allKnown = new Set(Object.values(TECH_SPECS).flat() as string[]);
  const other = flat.filter((s) => !allKnown.has(s));
  if (other.length) groups.push({ category: 'أخرى', items: other });
  return groups;
}

// ── Image Gallery ─────────────────────────────────────────────────────────────

function ImageGallery({ images }: { images: Listing['images'] }) {
  const primaryIndex = Math.max(0, images.findIndex((img) => img.isPrimary));
  const [selected,      setSelected]      = useState(primaryIndex);
  const [lightboxOpen,  setLightboxOpen]  = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = () => { setLightboxIndex(selected); setLightboxOpen(true); };
  const closeLightbox = () => setLightboxOpen(false);
  const lbPrev = () => setLightboxIndex((i) => (i - 1 + images.length) % images.length);
  const lbNext = () => setLightboxIndex((i) => (i + 1) % images.length);

  // Keyboard navigation + scroll lock
  useEffect(() => {
    if (!lightboxOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     closeLightbox();
      if (e.key === 'ArrowLeft')  lbPrev();
      if (e.key === 'ArrowRight') lbNext();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [lightboxOpen, images.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!images.length) {
    return (
      <div className="aspect-[4/3] bg-gray-100 rounded-xl flex items-center justify-center">
        <ImageOff className="w-14 h-14 text-gray-300" />
      </div>
    );
  }

  return (
    <>
      {/* ── Inline gallery ── */}
      <div>
        <div
          className="relative aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden group cursor-zoom-in"
          onClick={openLightbox}
        >
          <img
            src={images[selected].url}
            alt={`صورة ${selected + 1}`}
            className="w-full h-full object-cover"
          />
          {/* Zoom hint */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center pointer-events-none">
            <ZoomIn className="w-10 h-10 text-white opacity-0 group-hover:opacity-75 transition-opacity drop-shadow-lg" />
          </div>
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setSelected((s) => Math.max(0, s - 1)); }}
                disabled={selected === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setSelected((s) => Math.min(images.length - 1, s + 1)); }}
                disabled={selected === images.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <span className="absolute bottom-3 end-3 bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                {selected + 1} / {images.length}
              </span>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`shrink-0 w-[72px] h-[54px] rounded-lg overflow-hidden border-2 transition-all ${
                  i === selected
                    ? 'border-blue-600 ring-1 ring-blue-600'
                    : 'border-transparent hover:border-gray-300 opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img.url} alt={`مصغرة ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Main image — stop propagation so clicking it doesn't close */}
          <img
            src={images[lightboxIndex].url}
            alt={`صورة ${lightboxIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain select-none rounded-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Prev / Next */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); lbPrev(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
                title="السابق"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); lbNext(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
                title="التالي"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
            </>
          )}

          {/* Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm font-medium px-4 py-1.5 rounded-full tabular-nums select-none">
            {lightboxIndex + 1} / {images.length}
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div
              className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 max-w-[80vw] overflow-x-auto pb-1"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className={`shrink-0 w-14 h-10 rounded-md overflow-hidden border-2 transition-all ${
                    i === lightboxIndex
                      ? 'border-white opacity-100'
                      : 'border-white/20 opacity-50 hover:opacity-80'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── SVG Damage Map ────────────────────────────────────────────────────────────

type DamageStatus = DamageNorm;

const DAMAGE_COLORS: Record<DamageStatus, string> = {
  original:   '#e5e7eb',
  painted:    '#60a5fa',
  localPaint: '#fb923c',
  replaced:   '#f87171',
};

const DAMAGE_LABELS: Record<DamageStatus, string> = {
  original:   'أصلي',
  painted:    'مدهون',
  localPaint: 'دهان محلي',
  replaced:   'مستبدل',
};

const PANEL_AR: Record<string, string> = {
  frontBumper:      'مصد أمامي',
  hood:             'غطاء المحرك',
  leftFrontFender:  'رفراف أمامي أيسر',
  rightFrontFender: 'رفراف أمامي أيمن',
  roofPanel:        'سقف',
  frontLeftDoor:    'باب أمامي أيسر',
  frontRightDoor:   'باب أمامي أيمن',
  rearLeftDoor:     'باب خلفي أيسر',
  rearRightDoor:    'باب خلفي أيمن',
  leftRocker:       'عتبة يسرى',
  rightRocker:      'عتبة يمنى',
  leftRearFender:   'رفراف خلفي أيسر',
  rightRearFender:  'رفراف خلفي أيمن',
  trunk:            'باكاج',
  rearBumper:       'مصد خلفي',
};

function DamageMap({ damage }: { damage: Record<string, DamageEntry> }) {
  const [hovered, setHovered] = useState<string | null>(null);

  // RTL column mapping: col '1' = visual RIGHT, col '3' = visual LEFT
  function block(
    key: string,
    gridCol: string,
    gridRow: string,
    opts?: { leftWheel?: boolean; rightWheel?: boolean },
  ) {
    const status = damage[key]?.status ?? 'original';
    const color  = DAMAGE_COLORS[status as DamageStatus];
    const label  = PANEL_AR[key] ?? key;
    const isHov  = hovered === key;
    return (
      <div
        key={key}
        onMouseEnter={() => setHovered(key)}
        onMouseLeave={() => setHovered(null)}
        title={label}
        className="rounded-md flex items-center justify-center text-center leading-tight text-[9px] font-medium text-gray-600 transition-all duration-150 px-0.5"
        style={{
          gridColumn: gridCol,
          gridRow:    gridRow,
          position:   'relative',
          backgroundColor: color,
          border: `1px solid ${isHov ? '#2563eb' : '#9ca3af'}`,
          boxShadow: isHov ? '0 0 0 2px #bfdbfe' : undefined,
        }}
      >
        {opts?.leftWheel && (
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-3 h-8 bg-gray-500 rounded-full z-10 pointer-events-none" />
        )}
        {opts?.rightWheel && (
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-3 h-8 bg-gray-500 rounded-full z-10 pointer-events-none" />
        )}
        {label}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* ── Car grid map ── */}
      <div className="flex flex-col items-center gap-2 select-none">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">▲ أمام</span>

        <div className="px-5" style={{ overflow: 'visible' }}>
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: '50px 110px 50px',
              gridTemplateRows:    '26px 78px 10px 46px 46px 10px 78px 26px',
              overflow: 'visible',
            }}
          >
            {/* Row 1 – Front bumper */}
            {block('frontBumper', '2', '1')}

            {/* Row 2 – Front fenders + Hood */}
            {block('rightFrontFender', '1', '2', { rightWheel: true })}
            {block('hood',             '2', '2')}
            {block('leftFrontFender',  '3', '2', { leftWheel:  true })}

            {/* Row 3 – Windshield (decorative) */}
            <div key="ws" className="rounded-sm bg-blue-100" style={{ gridColumn: '2', gridRow: '3' }} />

            {/* Rows 4-5 – Doors + Roof (spans both rows) */}
            {block('frontRightDoor', '1', '4')}
            {block('roofPanel',      '2', '4 / 6')}
            {block('frontLeftDoor',  '3', '4')}
            {block('rearRightDoor',  '1', '5')}
            {block('rearLeftDoor',   '3', '5')}

            {/* Row 6 – Rear window (decorative) */}
            <div key="rw" className="rounded-sm bg-blue-100" style={{ gridColumn: '2', gridRow: '6' }} />

            {/* Row 7 – Rear fenders + Trunk */}
            {block('rightRearFender', '1', '7', { rightWheel: true })}
            {block('trunk',           '2', '7')}
            {block('leftRearFender',  '3', '7', { leftWheel:  true })}

            {/* Row 8 – Rear bumper */}
            {block('rearBumper', '2', '8')}
          </div>
        </div>

        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">▼ خلف</span>

        {/* Hover tooltip */}
        <div className="h-7 flex items-center justify-center">
          {hovered ? (
            <span className="text-xs text-gray-600 font-medium bg-gray-100 px-3 py-1 rounded-full">
              <strong>{PANEL_AR[hovered] ?? hovered}</strong>
              {' — '}
              {DAMAGE_LABELS[damage[hovered]?.status ?? 'original']}
            </span>
          ) : (
            <span className="text-xs text-gray-400 italic">مرّر الماوس على قطعة لمعرفة حالتها</span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {(Object.entries(DAMAGE_LABELS) as [DamageStatus, string][]).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span
              className="w-4 h-4 rounded border border-gray-300 shrink-0"
              style={{ backgroundColor: DAMAGE_COLORS[status as DamageStatus] }}
            />
            <span className="text-xs text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Panel summary */}
      <div className="w-full grid grid-cols-2 gap-2">
        {Object.entries(damage).map(([panel, entry]) => (
          <div
            key={panel}
            className={`flex flex-col bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100 ${entry.detail ? 'col-span-2' : ''}`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{PANEL_AR[panel] ?? panel}</span>
              <span
                className="font-medium px-1.5 py-0.5 rounded shrink-0 ms-2"
                style={{ backgroundColor: DAMAGE_COLORS[entry.status as DamageStatus], color: '#1f2937' }}
              >
                {DAMAGE_LABELS[entry.status]}
              </span>
            </div>
            {entry.detail && (
              <p className="text-xs text-gray-500 mt-1">ملاحظة: {entry.detail}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tech specs translation maps ───────────────────────────────────────────────

const CAT_AR: Record<string, string> = {
  Safety:     'الأمان والسلامة',
  Interior:   'التصميم الداخلي',
  Exterior:   'المظهر الخارجي',
  Multimedia: 'الوسائط المتعددة',
};

const SPEC_AR: Record<string, string> = {
  // Safety
  'ABS':                          'نظام منع انغلاق المكابح (ABS)',
  'EBD':                          'توزيع قوة الفرامل (EBD)',
  'Electronic Stability Control': 'نظام الثبات الإلكتروني (ESC)',
  'Traction Control':             'نظام مكافحة الانزلاق',
  'Hill Start Assist':            'مساعد الانطلاق على المنحدرات',
  'Brake Assist':                 'مساعد الفرملة الطارئة',
  'Driver Airbag':                'وسادة هوائية للسائق',
  'Passenger Airbag':             'وسادة هوائية للراكب',
  'Side Airbags':                 'وسائد هوائية جانبية',
  'Curtain Airbags':              'وسائد هوائية ستائرية',
  'Knee Airbag':                  'وسادة هوائية للركبة',
  'Forward Collision Warning':    'تحذير التصادم الأمامي',
  'Lane Departure Warning':       'تنبيه الخروج عن المسار',
  'Lane Keep Assist':             'مساعد الحفاظ على المسار',
  'Blind Spot Monitor':           'مراقبة النقطة العمياء',
  'Rear Cross-Traffic Alert':     'تنبيه حركة المرور الخلفية',
  'Adaptive Cruise Control':      'مثبت السرعة التكيّفي',
  'Rear Camera':                  'كاميرا خلفية',
  'Parking Sensors (Front)':      'حساسات ركن أمامية',
  'Parking Sensors (Rear)':       'حساسات ركن خلفية',
  '360° Camera':                  'كاميرا 360 درجة',
  // Interior
  'Leather Seats':                'مقاعد جلدية',
  'Heated Seats (Front)':         'مقاعد أمامية مدفأة',
  'Heated Seats (Rear)':          'مقاعد خلفية مدفأة',
  'Ventilated Seats':             'مقاعد مهواة',
  'Massage Seats':                'مقاعد مساج',
  'Power Driver Seat':            'مقعد السائق الكهربائي',
  'Power Passenger Seat':         'مقعد الراكب الكهربائي',
  'Memory Seats':                 'ذاكرة إعدادات المقعد',
  'Sunroof':                      'فتحة سقف',
  'Panoramic Roof':               'سقف بانورامي',
  'Automatic Climate Control':    'مكيف هواء أوتوماتيكي',
  'Dual-Zone Climate':            'تكييف بمنطقتين مستقلتين',
  'Tri-Zone Climate':             'تكييف بثلاث مناطق مستقلة',
  'Navigation System':            'نظام ملاحة (GPS)',
  'Head-Up Display':              'شاشة عرض أمامية (HUD)',
  'Digital Dashboard':            'لوحة عدادات رقمية',
  'Wireless Charging':            'شحن لاسلكي',
  'USB-A Ports':                  'منافذ USB-A',
  'USB-C Ports':                  'منافذ USB-C',
  'Ambient Lighting':             'إضاءة محيطية',
  // Exterior
  'Alloy Wheels':                 'عجلات ألمنيوم',
  '17" Wheels':                   'عجلات 17 بوصة',
  '18" Wheels':                   'عجلات 18 بوصة',
  '19" Wheels':                   'عجلات 19 بوصة',
  '20"+ Wheels':                  'عجلات 20 بوصة وأكثر',
  'LED Headlights':               'مصابيح أمامية LED',
  'Matrix LED Headlights':        'مصابيح LED ماتريكس',
  'LED Taillights':               'مصابيح خلفية LED',
  'Daytime Running Lights':       'أضواء نهارية (DRL)',
  'Auto Headlights':              'إضاءة أوتوماتيكية',
  'Fog Lights':                   'مصابيح ضباب',
  'Cornering Lights':             'مصابيح التحويل',
  'Power-Folding Mirrors':        'مرايا قابلة للطي كهربائياً',
  'Heated Mirrors':               'مرايا مدفأة',
  'Auto-Dimming Mirrors':         'مرايا ذاتية التعتيم',
  'Keyless Entry':                'دخول بدون مفتاح',
  'Keyless Start':                'تشغيل بدون مفتاح',
  'Power Tailgate':               'باب خلفي كهربائي',
  'Roof Rails':                   'حوامل سقف',
  'Tow Hook':                     'خطاف سحب',
  // Multimedia
  'AM/FM Radio':                  'راديو AM/FM',
  'DAB+ Radio':                   'راديو DAB+',
  'Bluetooth':                    'بلوتوث',
  'Wi-Fi Hotspot':                'نقطة Wi-Fi',
  'Apple CarPlay':                'آبل كار بلاي',
  'Android Auto':                 'أندرويد أوتو',
  'MirrorLink':                   'MirrorLink',
  'Premium Sound System':         'نظام صوتي ممتاز',
  'Subwoofer':                    'مضخم صوت',
  '8+ Speakers':                  '8 مكبرات صوت وأكثر',
  'Rear Entertainment Screen':    'شاشة ترفيه خلفية',
  'Voice Control':                'تحكم صوتي',
  'Steering Wheel Controls':      'أزرار تحكم بالمقود',
  'Wireless Phone Charging':      'شحن الهاتف لاسلكياً',
  'Multiple USB Ports':           'منافذ USB متعددة',
};

// ── Technical Specs Grid ──────────────────────────────────────────────────────

function TechSpecsGrid({ specs }: { specs: string[] }) {
  const groups = groupTechSpecs(specs);

  if (!groups.length) {
    return <p className="text-sm text-gray-400 text-center py-8">لا توجد مواصفات فنية مدرجة.</p>;
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {groups.map(({ category, items }) => (
        <div key={category}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            {CAT_AR[category] ?? category}
          </p>
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-4 h-4 rounded-full bg-green-100 border border-green-300 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-green-600" strokeWidth={3} />
                </span>
                {SPEC_AR[item] ?? item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ── Enum → Arabic label map ───────────────────────────────────────────────────

const ENUM_AR: Record<string, string> = {
  USED: 'مستعمل',       NEW: 'جديد',
  SEDAN: 'سيدان',       HATCHBACK: 'هاتشباك',    SUV: 'سيارة دفع رباعي',
  WAGON: 'ستيشن واغن',  COUPE: 'كوبيه',           CONVERTIBLE: 'كشف',
  VAN: 'فان',           PICKUP: 'بيكاب',           MINIVAN: 'ميني فان',
  GASOLINE: 'بنزين',    DIESEL: 'ديزل',            LPG: 'غاز',
  HYBRID: 'هجين',       ELECTRIC: 'كهربائي',
  MANUAL: 'عادي',       AUTOMATIC: 'أوتوماتيك',
  SEMI_AUTOMATIC: 'نصف أوتوماتيك', CVT: 'CVT',
  FWD: 'دفع أمامي',    RWD: 'دفع خلفي',          AWD: 'AWD',
  FOUR_WD: 'دفع رباعي',
  OWNER: 'من المالك',   DEALER: 'من معرض',         RENTAL: 'سيارة إيجار',
  OTHER: 'أخرى',
};

const NA = 'غير محدد';

function tr(v: string | undefined | null): string {
  if (!v) return NA;
  return ENUM_AR[v] ?? v;
}

// ── Ad Specs Table ────────────────────────────────────────────────────────────

function AdSpecsTable({ listing, compact = false }: { listing: Listing; compact?: boolean }) {
  const vd  = listing.vehicleDetails as any;
  const raw = listing as any;

  function boolVal(v: boolean | undefined | null): string {
    if (v == null) return NA;
    return v ? 'يوجد' : 'لا يوجد';
  }

  const make     = vd?.make        ?? raw.make        ?? vd?.brand     ?? raw.brand;
  const model    = vd?.model       ?? raw.model       ?? vd?.modelName ?? raw.modelName;
  const year     = vd?.year        ?? raw.year        ?? vd?.modelYear ?? raw.modelYear;
  const mileage  = vd?.mileage     ?? raw.mileage     ?? vd?.mileageKm ?? raw.mileageKm ?? vd?.odometer ?? raw.odometer;
  const heavyDmg = vd?.heavyDamageRecord ?? vd?.heavyDamage ?? raw.heavyDamage ?? raw.heavyDamageRecord;
  const condition = vd?.condition  ?? raw.condition;

  const rows: { label: string; value: string }[] = [
    { label: 'رقم الإعلان',         value: '#' + listing.id.slice(-8).toUpperCase() },
    { label: 'تاريخ الإعلان',       value: formatDate(listing.createdAt) },
    { label: 'حالة المركبة',        value: tr(condition) },
    { label: 'الماركة',             value: make    ?? NA },
    { label: 'الموديل',             value: model   ?? NA },
    { label: 'السنة',               value: year   != null ? String(year)   : NA },
    { label: 'نوع الهيكل',          value: tr(vd?.bodyType) },
    { label: 'قوة المحرك',          value: vd?.enginePower    != null ? `${vd.enginePower} hp`    : NA },
    { label: 'سعة المحرك',          value: vd?.engineCapacity != null ? `${vd.engineCapacity} cc` : NA },
    { label: 'نوع الوقود',          value: tr(vd?.fuelType) },
    { label: 'نوع ناقل الحركة',     value: tr(vd?.transmission) },
    { label: 'عدد السرعات',         value: vd?.gearCount != null ? `${vd.gearCount} سرعة` : NA },
    { label: 'الدفع',               value: tr(vd?.drivetrain) },
    { label: 'العداد (كم)',          value: mileage != null ? new Intl.NumberFormat('en-US').format(mileage) + ' كم' : NA },
    { label: 'الكفالة',             value: boolVal(vd?.warranty) },
    { label: 'سجل حوادث جسيمة',     value: boolVal(heavyDmg) },
    { label: 'قابل للمقايضة',       value: boolVal(vd?.tradeIn) },
    { label: 'المعلن',              value: tr(vd?.fromWho) },
  ];

  // Mobile-only clean layout: aligned key/value rows (label start, value end),
  // no fixed-width column or vertical divider — graceful wrapping on narrow screens.
  if (compact) {
    return (
      <div className="divide-y divide-gray-100">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
            <span className="text-gray-500 shrink-0">{row.label}</span>
            <span className={`font-medium text-end ${row.value === NA ? 'text-gray-300' : 'text-gray-900'}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {rows.map((row, i) => (
        <div key={row.label} className={`flex text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}`}>
          <span className="w-[48%] shrink-0 px-4 py-2.5 text-gray-500 font-medium border-e border-gray-100">
            {row.label}
          </span>
          <span className={`flex-1 px-4 py-2.5 font-medium ${row.value === NA ? 'text-gray-300' : 'text-gray-900'}`}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Offer Modal ───────────────────────────────────────────────────────────────

function OfferModal({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const [amount,     setAmount]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currencyLabel = listing.currency === 'USD' ? '$' : 'ل.س';
  const parsedAmount  = parseFloat(amount);
  const isValid       = !Number.isNaN(parsedAmount) && parsedAmount > 0;

  async function handleSubmit() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      await offersService.createOffer(listing.id, parsedAmount, listing.currency);
      toast.success('تم إرسال عرضك بنجاح');
      onClose();
    } catch {
      toast.error('تعذّر إرسال العرض، حاول مجدداً.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
        <h3 className="text-lg font-bold text-gray-900">تقديم عرض</h3>
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
          <span className="text-sm text-gray-500 font-medium">سعر المنتج:</span>
          <span className="text-base font-extrabold text-blue-700">
            {formatPrice(listing.price, listing.currency)}
          </span>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700">عرضك</label>
          <div className="relative">
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="أدخل عرضك"
              disabled={submitting}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-300 pe-14 disabled:opacity-60"
            />
            <span className="absolute end-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium pointer-events-none select-none">
              {currencyLabel}
            </span>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {submitting && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {submitting ? 'جارٍ الإرسال…' : 'إرسال'}
          </button>
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Seller Box ────────────────────────────────────────────────────────────────

function SellerBox({ listing, variant = 'full' }: { listing: Listing; variant?: 'full' | 'identity' | 'bar' }) {
  const router                        = useRouter();
  const { user, isAuthenticated }     = useAuthStore();
  const [chatLoading, setChatLoading] = useState(false);
  const [offerOpen,   setOfferOpen]   = useState(false);

  const isOwner     = !!user && !!listing.user && user.id === listing.user.id;
  const isCorporate = listing.user?.userType === 'CORPORATE' || !!listing.user?.corporateProfile;

  const profile = listing.user?.profile;
  const name = isCorporate && listing.user?.corporateProfile?.companyName
    ? listing.user.corporateProfile.companyName
    : profile
      ? `${profile.firstName} ${profile.lastName}`
      : listing.user?.email ?? 'بائع فردي';
  const initial = name.charAt(0).toUpperCase();
  const phone = listing.phoneNumber ?? listing.user?.phone ?? null;
  const phoneVisible = listing.showPhoneNumber !== false;
  const accountDate = listing.user?.createdAt ? formatDate(listing.user.createdAt) : null;

  async function handleSendMessage() {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setChatLoading(true);
    try {
      const room = await messagesService.createOrGetRoom(listing.id);
      router.push(`/messages?roomId=${room.id}`);
    } catch (err) {
      console.error('[SellerBox] createOrGetRoom error:', err);
    } finally {
      setChatLoading(false);
    }
  }

  // ── Mobile: identity-only block (name + follow seller), no contact buttons ──
  if (variant === 'identity') {
    return (
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">معلومات البائع</p>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-white font-bold text-lg">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-snug flex items-center gap-1">
              <span className="truncate">{name}</span>
              {isCorporate && (
                <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" aria-label="معرض موثّق" />
              )}
            </p>
            {!isCorporate && listing.user?.email && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{listing.user.email}</p>
            )}
            {isCorporate && listing.user?.id && (
              <Link
                href={`/listings?sellerId=${listing.user.id}`}
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 hover:underline mt-1 transition-colors"
              >
                <Store className="w-3 h-3 shrink-0" />
                عرض كل إعلانات المعرض
              </Link>
            )}
            {accountDate && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                عضو منذ {accountDate}
              </span>
            )}
          </div>
          {!isOwner && listing.user?.id && (
            <FavoriteSellerButton sellerId={listing.user.id} variant="icon" />
          )}
        </div>
      </div>
    );
  }

  // ── Mobile: sticky-bar actions (call / message / offer) ──
  if (variant === 'bar') {
    return (
      <>
        {offerOpen && (
          <OfferModal listing={listing} onClose={() => setOfferOpen(false)} />
        )}
        {isOwner ? (
          <Link
            href="/account/listings"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            <Settings className="w-4 h-4" />
            إدارة الإعلان
          </Link>
        ) : (
          <div className="flex items-stretch gap-2">
            {phoneVisible && phone ? (
              <a
                href={`tel:${phone}`}
                className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-200 text-gray-900 font-semibold py-2.5 rounded-xl transition-colors text-[13px] leading-tight text-center"
              >
                <Phone className="w-4 h-4 text-gray-600 shrink-0" />
                اتصال
              </a>
            ) : (
              <span className="flex-1 flex items-center justify-center gap-1.5 bg-gray-50 border border-dashed border-gray-200 text-gray-400 py-2.5 rounded-xl text-[13px] leading-tight text-center select-none">
                <Phone className="w-4 h-4 shrink-0" />
                لا يوجد رقم
              </span>
            )}
            <button
              onClick={handleSendMessage}
              disabled={chatLoading}
              className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-[13px] leading-tight text-center"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              {chatLoading ? 'جارٍ الفتح…' : 'إرسال رسالة'}
            </button>
            <button
              onClick={() => {
                if (!isAuthenticated) { router.push('/login'); return; }
                setOfferOpen(true);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-600 font-semibold py-2.5 rounded-xl transition-colors text-[13px] leading-tight text-center"
            >
              <Tag className="w-4 h-4 shrink-0" />
              تقديم عرض
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div>
      {offerOpen && (
        <OfferModal listing={listing} onClose={() => setOfferOpen(false)} />
      )}

      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">معلومات البائع</p>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-white font-bold text-lg">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 text-sm leading-snug flex items-center gap-1">
            <span className="truncate">{name}</span>
            {isCorporate && (
              <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" aria-label="معرض موثّق" />
            )}
          </p>
          {!isCorporate && listing.user?.email && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{listing.user.email}</p>
          )}
          {isCorporate && listing.user?.id && (
            <Link
              href={`/listings?sellerId=${listing.user.id}`}
              className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 hover:underline mt-1 transition-colors"
            >
              <Store className="w-3 h-3 shrink-0" />
              عرض كل إعلانات المعرض
            </Link>
          )}
        </div>
        {!isOwner && listing.user?.id && (
          <FavoriteSellerButton sellerId={listing.user.id} variant="icon" />
        )}
      </div>

      {accountDate && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          عضو منذ {accountDate}
        </div>
      )}

      {!phoneVisible ? (
        <div className="w-full flex items-center justify-center gap-2 bg-gray-50 border border-dashed border-gray-200 text-gray-400 py-2.5 rounded-xl text-sm mb-3 cursor-not-allowed select-none">
          <Phone className="w-4 h-4" />
          الرقم مخفي
        </div>
      ) : phone ? (
        <a
          href={`tel:${phone}`}
          className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-900 font-semibold py-2.5 rounded-xl transition-colors text-sm mb-3"
        >
          <Phone className="w-4 h-4 text-gray-500" />
          {phone}
        </a>
      ) : (
        <div className="w-full flex items-center justify-center gap-2 bg-gray-50 border border-dashed border-gray-200 text-gray-400 py-2.5 rounded-xl text-sm mb-3">
          <Phone className="w-4 h-4" />
          لا يوجد رقم هاتف
        </div>
      )}

      {isOwner ? (
        <Link
          href="/account/listings"
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          <Settings className="w-4 h-4" />
          إدارة الإعلان
        </Link>
      ) : (
        <div className="space-y-2">
          <button
            onClick={handleSendMessage}
            disabled={chatLoading}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            <MessageSquare className="w-4 h-4" />
            {chatLoading ? 'جارٍ الفتح…' : 'إرسال رسالة'}
          </button>
          <button
            onClick={() => {
              if (!isAuthenticated) { router.push('/login'); return; }
              setOfferOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-600 font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            <Tag className="w-4 h-4" />
            تقديم عرض
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tab Panel ─────────────────────────────────────────────────────────────────

type TabId = 'details' | 'description' | 'damage' | 'specs' | 'location';

// Desktop: 4 tabs (detail table lives in a separate grid column).
const TABS: { id: TabId; label: string }[] = [
  { id: 'description', label: 'الوصف' },
  { id: 'damage',      label: 'تقرير الأضرار والطلاء' },
  { id: 'specs',       label: 'المواصفات الفنية' },
  { id: 'location',    label: 'الموقع' },
];

// Mobile (sahibinden-style): 3 tabs — tab 1 stacks table + damage + specs.
const MOBILE_TABS: { id: TabId; label: string }[] = [
  { id: 'details',     label: 'تفاصيل الإعلان' },
  { id: 'description', label: 'الوصف' },
  { id: 'location',    label: 'الموقع' },
];

function TabPanel({ listing, mobile = false }: { listing: Listing; mobile?: boolean }) {
  const [activeTab, setActiveTab] = useState<TabId>(mobile ? 'details' : 'description');
  const vd  = listing.vehicleDetails as any;
  const raw = listing as any;

  const rawDamage =
    vd?.damageReport  ??
    vd?.damageReports ??
    raw.damageReport  ??
    raw.damageReports;
  const damage = rawDamage && Object.keys(rawDamage).length > 0
    ? normalizeDamageReport(rawDamage as Record<string, string | { status: string; detail?: string }>)
    : null;

  const techSpecs = (
    vd?.technicalSpecs ?? vd?.specs ?? vd?.features ??
    raw.technicalSpecs ?? raw.specs ?? raw.features
  ) as string[] | undefined;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Tab bar */}
      <div className="flex bg-gray-50/80 border-b border-gray-200 overflow-x-auto">
        {(mobile ? MOBILE_TABS : TABS).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-blue-600 border-blue-600 bg-white'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-6 py-5">
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* (a) Key-value detail table — always shown */}
            <section>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">تفاصيل الإعلان</p>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <AdSpecsTable listing={listing} compact />
              </div>
            </section>

            {/* (b) Damage & paint report — only if data present */}
            {damage && (
              <section>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">تقرير الأضرار والطلاء</p>
                <DamageMap damage={damage} />
              </section>
            )}

            {/* (c) Equipment / technical specs — only if present */}
            {techSpecs?.length ? (
              <section>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">المواصفات الفنية</p>
                <TechSpecsGrid specs={techSpecs} />
              </section>
            ) : null}
          </div>
        )}

        {activeTab === 'description' && (
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
            {listing.description || <span className="text-gray-400 italic">لا يوجد وصف.</span>}
          </p>
        )}

        {activeTab === 'damage' && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-4">تقرير حالة الهيكل</p>
            {damage ? (
              <DamageMap damage={damage} />
            ) : (
              <p className="text-sm text-gray-400 text-center py-10">
                لم يُقدَّم تقرير أضرار لهذا الإعلان.
              </p>
            )}
          </div>
        )}

        {activeTab === 'specs' && (
          techSpecs?.length
            ? <TechSpecsGrid specs={techSpecs} />
            : <p className="text-sm text-gray-400 text-center py-10">لا توجد مواصفات فنية مدرجة.</p>
        )}

        {activeTab === 'location' && (
          <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400 gap-3">
            <MapPin className="w-10 h-10 text-gray-300" />
            <p className="font-medium text-gray-600">{listing.city}</p>
            <p className="text-sm">خرائط قادمة قريباً.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Q&A Section ───────────────────────────────────────────────────────────────

function QASection({
  listingId,
  sellerId,
  initialQuestions,
}: {
  listingId: string;
  sellerId?: string;
  initialQuestions?: unknown[];
}) {
  const { user, isAuthenticated } = useAuthStore();
  const isSeller = !!user && !!sellerId && user.id === sellerId;

  const seed = (initialQuestions ?? []) as Question[];
  const [questions,  setQuestions]  = useState<Question[]>(seed);
  const [qaLoading,  setQaLoading]  = useState(seed.length === 0);
  const [draft,      setDraft]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialQuestions && initialQuestions.length >= 0) {
      setQaLoading(false);
      return;
    }
    let cancelled = false;
    qaService.getForListing(listingId)
      .then((list) => { if (!cancelled) setQuestions(list); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setQaLoading(false); });
    return () => { cancelled = true; };
  }, [listingId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit() {
    const text = draft.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      const newQ = await qaService.askQuestion(listingId, text);
      const enriched = { ...newQ, askedBy: newQ.askedBy ?? user ?? undefined };
      setQuestions((prev) => [enriched, ...prev]);
      setDraft('');
      toast.success('تم إرسال سؤالك بنجاح.');
    } catch {
      toast.error('تعذّر إرسال السؤال. حاول مجدداً.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <HelpCircle className="w-4.5 h-4.5 text-orange-400" style={{ width: 18, height: 18 }} />
          أسئلة وأجوبة
        </h2>
      </div>

      <div className="px-5 py-5 space-y-5">
        {!isSeller && (
          <div className="space-y-2">
            {!isAuthenticated && (
              <p className="text-xs text-gray-400 mb-1">
                لطرح سؤال{' '}
                <a href="/login" className="text-orange-500 hover:underline font-medium">سجّل دخولك</a>.
              </p>
            )}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={!isAuthenticated || submitting}
              rows={3}
              placeholder="اكتب سؤالك للبائع عن هذا الإعلان…"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none disabled:bg-gray-50 disabled:cursor-not-allowed transition"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!isAuthenticated || submitting || !draft.trim()}
                className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'جارٍ الإرسال…' : 'إرسال السؤال'}
              </button>
            </div>
          </div>
        )}

        {qaLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-5/6" />
              </div>
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <HelpCircle className="w-9 h-9 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">لا توجد أسئلة على هذا الإعلان بعد.</p>
            <p className="text-xs text-gray-400">كن أول من يسأل!</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto space-y-4 pe-1">
            {questions.map((q) => (
              <div key={q.id} className="space-y-2">
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0 mt-0.5">
                    {askerInitials(q)}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 mb-1">
                      {maskedAskerName(q)}
                      <span className="ms-2 font-normal text-gray-300">
                        {new Date(q.createdAt).toLocaleDateString('ar-SY', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </p>
                    <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 rounded-xl px-3.5 py-2.5">
                      {questionText(q)}
                    </p>
                  </div>
                </div>
                {q.answer && (
                  <div className="ms-9 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 space-y-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      رد البائع
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed">{q.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function ListingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-6">
        <div className="h-4 w-72 bg-gray-200 rounded mb-4" />
        <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5 mb-5 flex items-center justify-between">
          <div className="h-9 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-28 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Gallery + tabs skeleton */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="aspect-[4/3] bg-gray-200 rounded-xl mb-3" />
              <div className="flex gap-2">
                {[...Array(4)].map((_, i) => <div key={i} className="w-[72px] h-[54px] bg-gray-200 rounded-lg" />)}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="h-12 bg-gray-100 border-b border-gray-200" />
              <div className="px-6 py-5 space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${[100,90,95,85,70][i]}%` }} />)}
              </div>
            </div>
          </div>
          {/* Specs skeleton */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="h-10 bg-gray-100 border-b border-gray-100" />
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="w-[48%] px-4 py-2.5 border-e border-gray-100"><div className="h-3.5 bg-gray-200 rounded w-3/4" /></div>
                  <div className="flex-1 px-4 py-2.5"><div className="h-3.5 bg-gray-200 rounded w-1/2" /></div>
                </div>
              ))}
            </div>
          </div>
          {/* Seller skeleton (sticky) */}
          <div className="lg:col-span-4 lg:sticky lg:top-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="h-3.5 w-16 bg-gray-200 rounded mb-4" />
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-28 bg-gray-200 rounded" />
                  <div className="h-3 w-36 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="h-10 bg-gray-200 rounded-xl mb-2" />
              <div className="h-11 bg-gray-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 404 / Error State ─────────────────────────────────────────────────────────

function ListingNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">الإعلان غير موجود</h1>
        <p className="text-gray-500 text-sm mb-8">
          قد يكون هذا الإعلان قد حُذف أو انتهت صلاحيته أو الرابط غير صحيح.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
        >
          <Home className="w-4 h-4" />
          العودة إلى الرئيسية
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ListingDetailPage() {
  const params = useParams();
  const id     = params.id as string;

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [listing,  setListing]  = useState<Listing | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (isAuthenticated) recommendationsService.trackView(id);
  }, [id, isAuthenticated]);

  useEffect(() => {
    listingsService
      .getListingById(id)
      .then((data) => {
        console.log('[ListingDetail] full listing JSON:', JSON.stringify(data, null, 2));
        console.log('[ListingDetail] vehicleDetails:', data?.vehicleDetails);
        setListing(data);
      })
      .catch((err) => {
        console.error('[ListingDetail] fetch error:', err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useMobileTitle(listing?.title);

  if (loading)              return <ListingSkeleton />;
  if (notFound || !listing) return <ListingNotFound />;

  // Single seed for Q&A so both the desktop and mobile trees mount QASection
  // without triggering a duplicate fetch (the effect early-returns when
  // initialQuestions is provided — see QASection).
  const seededQuestions = listing.questions ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-6">

        {/* ══ Desktop (lg+) — unchanged 3-column layout ══ */}
        <div className="hidden lg:block">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-4 flex-wrap">
            <Link href="/" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
              <Home className="w-3.5 h-3.5" />
              الرئيسية
            </Link>
            <span>/</span>
            {listing.category && (
              <>
                <Link
                  href={`/listings?categoryId=${listing.category.id ?? ''}`}
                  className="hover:text-blue-600 transition-colors"
                >
                  {listing.category.name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-gray-700 font-medium line-clamp-1">{listing.title}</span>
          </nav>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug mb-4">
            {listing.title}
          </h1>

          {/* Price bar */}
          <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4 mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-3xl font-extrabold text-blue-700 leading-none">
              {formatPrice(listing.price, listing.currency)}
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <MapPin className="w-4 h-4 shrink-0" />
                {listing.city}
              </div>
              <FavoriteButton listingId={listing.id} checkOnMount variant="detail" />
              <CompareButton listing={listing} variant="detail" />
            </div>
          </div>

          {/* Main grid — 12-col, 3-column desktop (RTL: gallery right · specs middle · seller left) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

            {/* RIGHT — Image Gallery + Tabs + Q&A (col-span-5) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <ImageGallery images={listing.images ?? []} />
              </div>
              <TabPanel listing={listing} />
              <QASection listingId={listing.id} sellerId={listing.user?.id} initialQuestions={seededQuestions} />
            </div>

            {/* MIDDLE — Ad Specs Table (col-span-3) */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">تفاصيل الإعلان</p>
                </div>
                <AdSpecsTable listing={listing} />
              </div>
            </div>

            {/* LEFT — Seller Box (col-span-4, sticky) */}
            <div className="lg:col-span-4 lg:sticky lg:top-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <SellerBox listing={listing} />
              </div>
            </div>

          </div>
        </div>

        {/* ══ Mobile (<lg) — sahibinden-style linear order ══ */}
        <div className="lg:hidden space-y-4 pb-32">

          {/* 1 — Favorite + Compare (moved above the gallery) */}
          <div className="flex items-center gap-3">
            <FavoriteButton listingId={listing.id} checkOnMount variant="detail" />
            <CompareButton listing={listing} variant="detail" />
          </div>

          {/* 2 — Image gallery (full-bleed, no card) */}
          <ImageGallery images={listing.images ?? []} />

          {/* 3 — Title + price + location + date */}
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-snug mb-2">
              {listing.title}
            </h1>
            <p className="text-2xl font-extrabold text-blue-700 leading-none mb-2.5">
              {formatPrice(listing.price, listing.currency)}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 shrink-0" />
                {listing.city}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                {formatDate(listing.createdAt)}
              </span>
            </div>
          </div>

          {/* 4 — Seller identity (name + follow seller) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <SellerBox listing={listing} variant="identity" />
          </div>

          {/* 5 — Tabs (3-tab sahibinden layout; tab 1 stacks table + damage + specs) */}
          <TabPanel listing={listing} mobile />

          {/* 6 — Q&A (last) */}
          <QASection listingId={listing.id} sellerId={listing.user?.id} initialQuestions={seededQuestions} />

        </div>

        {/* ══ Mobile sticky action bar — transparent, floats above BottomNav ══ */}
        <div className="lg:hidden fixed inset-x-0 bottom-[4.5rem] md:bottom-3 z-[60] px-4">
          <SellerBox listing={listing} variant="bar" />
        </div>
      </div>
    </div>
  );
}
