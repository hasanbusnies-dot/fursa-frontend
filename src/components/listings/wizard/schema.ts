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

export type PanelDef = { key: string; label: string };

// The 15 reportable panels — the API contract for attributes.damageReport keys.
// 13 are drawn as shapes in CarDamageDiagram; the two rockers (عتبة) have no
// drawn shape (the reference car art has none) and are marked via the panel
// list only.
export const SVG_PANELS: PanelDef[] = [
  { key: 'frontBumper',      label: 'مصد أمامي' },
  { key: 'hood',             label: 'غطاء المحرك' },
  { key: 'leftFrontFender',  label: 'رفراف أمامي أيسر' },
  { key: 'rightFrontFender', label: 'رفراف أمامي أيمن' },
  { key: 'frontLeftDoor',    label: 'باب أمامي أيسر' },
  { key: 'roofPanel',        label: 'سقف' },
  { key: 'frontRightDoor',   label: 'باب أمامي أيمن' },
  { key: 'leftRocker',       label: 'عتبة يسرى' },
  { key: 'rearLeftDoor',     label: 'باب خلفي أيسر' },
  { key: 'rearRightDoor',    label: 'باب خلفي أيمن' },
  { key: 'rightRocker',      label: 'عتبة يمنى' },
  { key: 'leftRearFender',   label: 'رفراف خلفي أيسر' },
  { key: 'trunk',            label: 'باكاج' },
  { key: 'rightRearFender',  label: 'رفراف خلفي أيمن' },
  { key: 'rearBumper',       label: 'مصد خلفي' },
];

export const PANEL_LABELS: Record<string, string> = Object.fromEntries(
  SVG_PANELS.map((p) => [p.key, p.label]),
);

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
  // Catalog discriminator — set from the doushesh catalog selection. 'VEHICLE' ⇒ the
  // car-shaped steps (vehicle info / damage / tech specs) apply and make/model/year are
  // required; 'GENERIC' ⇒ category-specific attributes drive the form instead.
  categoryKind: z.enum(['VEHICLE', 'GENERIC']).default('GENERIC'),

  // Step 1 — Vehicle Info (make/model/year required only on the VEHICLE path — see superRefine)
  categoryId:   z.string().min(1, 'يرجى اختيار فئة'),
  condition:    z.enum(['NEW', 'USED']),
  make:         z.string().optional(),
  series:       z.string().optional(),
  model:        z.string().optional(),
  chassis:      z.string().optional(),
  year:         numOpt(1900, currentYear + 1),
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
  // These bounds must never be LOOSER than the backend's createListingSchema —
  // anything this schema accepts but the API rejects becomes a 400 the wizard
  // can't explain, after the seller has filled in every step. Stricter is fine.
  // Backend (listing.schemas.ts): title 5–150, description 20–5000, price ≤ 1e9,
  // city 2–100, district/neighborhood ≤ 100, address ≤ 255.
  title:          z.string().min(5, 'حد أدنى 5 أحرف').max(100, 'حد أقصى 100 حرف'),
  description:    z.string().min(20, 'حد أدنى 20 حرفاً').max(2000, 'حد أقصى 2000 حرف'),
  price:          z.number({ message: 'أدخل سعراً صحيحاً' })
                    .positive('يجب أن يكون أكبر من صفر')
                    .max(999_999_999, 'السعر كبير جداً'),
  currency:       z.enum(['SYP', 'USD']),
  acceptsOffers:  z.boolean().default(true),
  country:        z.string().min(1, 'الدولة مطلوبة'),
  city:           z.string().min(2, 'المحافظة مطلوبة'),
  district:       z.string().max(100, 'حد أقصى 100 حرف').optional(),
  neighborhood:   z.string().max(100, 'حد أقصى 100 حرف').optional(),
  /**
   * The DEEPEST location-catalog region the seller picked — a PLACE slug, or the
   * GOVERNORATE slug when they chose «أخرى» and typed a name into `neighborhood`
   * (Model B). A SLUG, never an id: `regions.id` is deliberately absent from every
   * catalog payload.
   *
   * The backend's `resolveLocation` derives city/governorate/neighborhood FROM this
   * and overwrites whatever text we post — so `city` below is sent for the legacy
   * no-region path and as a belt-and-braces value, not as the source of truth.
   * Optional because the backend still accepts a city-only payload.
   */
  regionSlug:     z.string().max(120).optional(),
  address:        z.string().max(255, 'حد أقصى 255 حرفاً').optional(),
  // Map pin — optional by design (a seller may not want to reveal an exact spot,
  // and the detail page renders text-only when absent). Bounds mirror the backend
  // (listing.schemas.ts). Set via setValue from the picker, never registered as an
  // input; always sent as a PAIR or not at all.
  latitude:       z.number().min(-90).max(90).optional(),
  longitude:      z.number().min(-180).max(180).optional(),
  // Seller opt-out: no map at all on the listing — not even the approximate
  // governorate view the detail page otherwise derives from `city`. Rides in
  // `attributes._hideMap` (see HIDE_MAP_ATTR_KEY) rather than a column.
  hideMap:        z.boolean().optional(),

  // Step 4 — Tech specs
  technicalSpecs: z.array(z.string()).default([]),

  // Step 6 — Contact Info
  phoneNumber:     z.string().optional(),
  showPhoneNumber: z.boolean().default(true),
}).superRefine((d, ctx) => {
  // On the vehicle path, make/model/year are mandatory (they come from the catalog
  // brand/model selection + the vehicle-info step). Skipped entirely for generic categories.
  if (d.categoryKind !== 'VEHICLE') return;
  if (!d.make)  ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['make'],  message: 'الماركة مطلوبة' });
  if (!d.model) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['model'], message: 'الموديل مطلوب' });
  if (d.year == null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['year'], message: 'السنة مطلوبة' });
});

export type WizardFormData = z.infer<typeof wizardSchema>;
