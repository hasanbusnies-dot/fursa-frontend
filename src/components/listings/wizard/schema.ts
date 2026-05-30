import { z } from 'zod';
import { CAR_CATALOG } from '@/data/car-catalog';

// ── Damage map ────────────────────────────────────────────────────────────────

export const DAMAGE_STATUSES = ['ORIGINAL', 'LOCAL_PAINTED', 'PAINTED', 'REPLACED'] as const;
export type DamageStatus = typeof DAMAGE_STATUSES[number];

export const STATUS_LABELS: Record<DamageStatus, string> = {
  ORIGINAL:      'أصلي',
  LOCAL_PAINTED: 'دهان محلي',
  PAINTED:       'مدهون',
  REPLACED:      'مستبدل',
};

export const STATUS_COLORS: Record<DamageStatus, { fill: string; stroke: string; badge: string }> = {
  ORIGINAL:      { fill: '#e5e7eb', stroke: '#9ca3af', badge: 'bg-gray-200 text-gray-600' },
  LOCAL_PAINTED: { fill: '#fb923c', stroke: '#ea580c', badge: 'bg-orange-400 text-white' },
  PAINTED:       { fill: '#60a5fa', stroke: '#2563eb', badge: 'bg-blue-400 text-white' },
  REPLACED:      { fill: '#f87171', stroke: '#dc2626', badge: 'bg-red-400 text-white' },
};

export function nextDamageStatus(current: DamageStatus): DamageStatus {
  const idx = DAMAGE_STATUSES.indexOf(current);
  return DAMAGE_STATUSES[(idx + 1) % DAMAGE_STATUSES.length];
}

export type PanelDef = {
  key: string; label: string; short: string;
  x: number; y: number; w: number; h: number; rx?: number;
};

// viewBox="0 0 300 496"
export const SVG_PANELS: PanelDef[] = [
  { key: 'frontBumper',      label: 'مصد أمامي',          short: 'M.Amami',  x: 90,  y: 16,  w: 120, h: 26,  rx: 10 },
  { key: 'hood',             label: 'غطاء المحرك',        short: 'Ghata',    x: 78,  y: 46,  w: 144, h: 104, rx: 8  },
  { key: 'leftFrontFender',  label: 'رفراف أمامي أيسر',   short: 'R.Am.Ys',  x: 32,  y: 46,  w: 42,  h: 104, rx: 6  },
  { key: 'rightFrontFender', label: 'رفراف أمامي أيمن',   short: 'R.Am.Ym',  x: 226, y: 46,  w: 42,  h: 104, rx: 6  },
  { key: 'frontLeftDoor',    label: 'باب أمامي أيسر',     short: 'B.Am.Ys',  x: 32,  y: 174, w: 64,  h: 88,  rx: 4  },
  { key: 'roofPanel',        label: 'سقف',                short: 'Saqf',     x: 100, y: 174, w: 100, h: 88,  rx: 4  },
  { key: 'frontRightDoor',   label: 'باب أمامي أيمن',     short: 'B.Am.Ym',  x: 204, y: 174, w: 64,  h: 88,  rx: 4  },
  { key: 'leftRocker',       label: 'عتبة يسرى',          short: 'E.Ysr',    x: 32,  y: 264, w: 24,  h: 58,  rx: 3  },
  { key: 'rearLeftDoor',     label: 'باب خلفي أيسر',      short: 'B.Kh.Ys',  x: 58,  y: 264, w: 84,  h: 58,  rx: 4  },
  { key: 'rearRightDoor',    label: 'باب خلفي أيمن',      short: 'B.Kh.Ym',  x: 158, y: 264, w: 84,  h: 58,  rx: 4  },
  { key: 'rightRocker',      label: 'عتبة يمنى',          short: 'E.Ymn',    x: 244, y: 264, w: 24,  h: 58,  rx: 3  },
  { key: 'leftRearFender',   label: 'رفراف خلفي أيسر',    short: 'R.Kh.Ys',  x: 32,  y: 346, w: 42,  h: 104, rx: 6  },
  { key: 'trunk',            label: 'باكاج',              short: 'Sandouq',  x: 78,  y: 346, w: 144, h: 104, rx: 8  },
  { key: 'rightRearFender',  label: 'رفراف خلفي أيمن',    short: 'R.Kh.Ym',  x: 226, y: 346, w: 42,  h: 104, rx: 6  },
  { key: 'rearBumper',       label: 'مصد خلفي',           short: 'M.Khalfi', x: 90,  y: 454, w: 120, h: 26,  rx: 10 },
];

export type PanelState = { status: DamageStatus; detail: string };
export type DamageReportState = Record<string, PanelState>;

export function getDefaultDamageReport(): DamageReportState {
  return Object.fromEntries(
    SVG_PANELS.map((p) => [p.key, { status: 'ORIGINAL' as DamageStatus, detail: '' }]),
  );
}

// ── Tech specs ────────────────────────────────────────────────────────────────

export const TECH_SPECS = {
  Safety: [
    'ABS', 'EBD', 'Electronic Stability Control', 'Traction Control', 'Hill Start Assist',
    'Brake Assist', 'Driver Airbag', 'Passenger Airbag', 'Side Airbags',
    'Curtain Airbags', 'Knee Airbag', 'Forward Collision Warning',
    'Lane Departure Warning', 'Lane Keep Assist', 'Blind Spot Monitor',
    'Rear Cross-Traffic Alert', 'Adaptive Cruise Control',
    'Rear Camera', 'Parking Sensors (Front)', 'Parking Sensors (Rear)', '360° Camera',
  ],
  Interior: [
    'Leather Seats', 'Heated Seats (Front)', 'Heated Seats (Rear)', 'Ventilated Seats',
    'Massage Seats', 'Power Driver Seat', 'Power Passenger Seat', 'Memory Seats',
    'Sunroof', 'Panoramic Roof', 'Automatic Climate Control', 'Dual-Zone Climate',
    'Tri-Zone Climate', 'Navigation System', 'Head-Up Display', 'Digital Dashboard',
    'Wireless Charging', 'USB-A Ports', 'USB-C Ports', 'Ambient Lighting',
  ],
  Exterior: [
    'Alloy Wheels', '17" Wheels', '18" Wheels', '19" Wheels', '20"+ Wheels',
    'LED Headlights', 'Matrix LED Headlights', 'LED Taillights',
    'Daytime Running Lights', 'Auto Headlights', 'Fog Lights', 'Cornering Lights',
    'Power-Folding Mirrors', 'Heated Mirrors', 'Auto-Dimming Mirrors',
    'Keyless Entry', 'Keyless Start', 'Power Tailgate', 'Roof Rails', 'Tow Hook',
  ],
  Multimedia: [
    'AM/FM Radio', 'DAB+ Radio', 'Bluetooth', 'Wi-Fi Hotspot',
    'Apple CarPlay', 'Android Auto', 'MirrorLink',
    'Premium Sound System', 'Subwoofer', '8+ Speakers',
    'Rear Entertainment Screen', 'Voice Control', 'Steering Wheel Controls',
    'Wireless Phone Charging', 'Multiple USB Ports',
  ],
} as const satisfies Record<string, readonly string[]>;

export type TechSpecCategory = keyof typeof TECH_SPECS;

// ── Location ──────────────────────────────────────────────────────────────────

export const SYRIAN_GOVERNORATES = [
  'دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس',
  'إدلب', 'دير الزور', 'الرقة', 'درعا', 'السويداء', 'القنيطرة', 'ريف دمشق', 'الحسكة',
];

// Derived from the shared static catalog so the form and the filter use the
// same brand list. 'أخرى' (Other) is appended as a UI-only sentinel.
export const VEHICLE_MAKES = [...CAR_CATALOG.map((c) => c.brand), 'أخرى'];

export const CAR_COLORS = [
  'أبيض', 'فضي', 'رمادي', 'أسود', 'كحلي', 'أزرق', 'أحمر', 'خمري',
  'أخضر', 'أصفر', 'برتقالي', 'بني', 'بيج', 'ذهبي', 'بنفسجي', 'أخرى',
];

export const FUEL_TYPE_OPTIONS = [
  { value: 'GASOLINE',  label: 'بنزين' },
  { value: 'DIESEL',    label: 'ديزل' },
  { value: 'LPG',       label: 'غاز (LPG)' },
  { value: 'HYBRID',    label: 'هجين' },
  { value: 'ELECTRIC',  label: 'كهربائي' },
  { value: 'OTHER',     label: 'أخرى' },
] as const;

export const TRANSMISSION_OPTIONS = [
  { value: 'MANUAL',        label: 'يدوي' },
  { value: 'AUTOMATIC',     label: 'أوتوماتيك' },
  { value: 'SEMI_AUTOMATIC', label: 'نصف أوتوماتيك' },
  { value: 'CVT',           label: 'CVT' },
] as const;

export const BODY_TYPE_OPTIONS = [
  { value: 'SEDAN',       label: 'سيدان' },
  { value: 'HATCHBACK',   label: 'هاتشباك' },
  { value: 'SUV',         label: 'SUV' },
  { value: 'WAGON',       label: 'ستيشن واغن' },
  { value: 'COUPE',       label: 'كوبيه' },
  { value: 'CONVERTIBLE', label: 'كشف' },
  { value: 'VAN',         label: 'فان' },
  { value: 'PICKUP',      label: 'بيكاب' },
  { value: 'MINIVAN',     label: 'ميني فان' },
] as const;

export const DRIVETRAIN_OPTIONS = [
  { value: 'FWD',     label: 'دفع أمامي (FWD)' },
  { value: 'RWD',     label: 'دفع خلفي (RWD)' },
  { value: 'AWD',     label: 'AWD' },
  { value: 'FOUR_WD', label: '4WD' },
] as const;

export const FROM_WHO_OPTIONS = [
  { value: 'OWNER',  label: 'من المالك' },
  { value: 'DEALER', label: 'من معرض' },
  { value: 'RENTAL', label: 'سيارة إيجار' },
] as const;

// ── Zod schema ────────────────────────────────────────────────────────────────

function numOpt(min?: number, max?: number) {
  const base = (() => {
    if (min !== undefined && max !== undefined) return z.number().min(min).max(max);
    if (min !== undefined) return z.number().min(min);
    return z.number();
  })();
  return z.preprocess(
    (v) =>
      v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v as number))
        ? undefined
        : Number(v),
    base.optional(),
  );
}

const currentYear = new Date().getFullYear();

export const wizardSchema = z.object({
  // Step 1 — Vehicle Info
  categoryId:   z.string().min(1, 'يرجى اختيار فئة'),
  condition:    z.enum(['NEW', 'USED']),
  make:         z.string().min(1, 'الماركة مطلوبة'),
  series:       z.string().optional(),
  model:        z.string().min(1, 'الموديل مطلوب'),
  chassis:      z.string().optional(),
  year:         z.number({ message: 'أدخل سنة صحيحة' }).int()
                  .min(1900, 'السنة قديمة جداً').max(currentYear + 1, 'سنة غير صحيحة'),
  mileage:      numOpt(0),
  seats:        numOpt(1, 20),
  color:          z.string().optional(),
  heavyDamage:    z.boolean().default(false),
  plateNumber:    z.string().optional(),
  fuelType:       z.string().optional(),
  transmission:   z.string().optional(),
  bodyType:       z.string().optional(),
  enginePower:    numOpt(0),
  engineCapacity: numOpt(0),
  drivetrain:     z.string().optional(),
  gearCount:      numOpt(1),
  warranty:       z.boolean().optional(),
  tradeIn:        z.boolean().optional(),
  fromWho:        z.string().optional(),

  // Step 2 — Ad Details + Location
  title:          z.string().min(5, 'حد أدنى 5 أحرف').max(100, 'حد أقصى 100 حرف'),
  description:    z.string().min(10, 'حد أدنى 10 أحرف').max(2000, 'حد أقصى 2000 حرف'),
  price:          z.number({ message: 'أدخل سعراً صحيحاً' }).positive('يجب أن يكون أكبر من صفر'),
  currency:       z.enum(['SYP', 'USD']),
  acceptsOffers:  z.boolean().default(true),
  country:        z.string().min(1, 'الدولة مطلوبة'),
  city:           z.string().min(1, 'المدينة مطلوبة'),
  district:       z.string().optional(),
  neighborhood:   z.string().optional(),

  // Step 4 — Tech specs
  technicalSpecs: z.array(z.string()).default([]),

  // Step 6 — Contact Info
  phoneNumber:     z.string().optional(),
  showPhoneNumber: z.boolean().default(true),
});

export type WizardFormData = z.infer<typeof wizardSchema>;

export const WIZARD_STEP_LABELS = [
  'الفئة', 'معلومات المركبة', 'تفاصيل الإعلان', 'تقرير الأضرار', 'المواصفات الفنية', 'الصور', 'معلومات التواصل', 'مراجعة',
] as const;

export const STEP_TRIGGER_FIELDS: Partial<Record<number, (keyof WizardFormData)[]>> = {
  1: ['categoryId'],
  2: ['condition', 'make', 'model', 'year'],
  3: ['title', 'description', 'price', 'currency', 'country', 'city'],
};
