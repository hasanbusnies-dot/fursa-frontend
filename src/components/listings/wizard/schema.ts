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

// ── Which vehicles actually HAVE these panels ─────────────────────────────────
/**
 * Catalog categories whose body is the 15-panel car shell the diagram draws.
 *
 * The panel list above is not a generic "vehicle condition" model — it is one
 * specific body: bonnet, four doors, two rockers, a roof and a boot. Being a
 * vehicle is not the test. A motorcycle has no doors, a truck is a cab plus a
 * separate box, a trailer has no bonnet, and drawing a car outline for any of
 * them reports panels that do not exist on the thing being sold.
 *
 * Keyed on the listing's own category slug because the catalog already puts the
 * body type at exactly that level: a listing's `categoryId` resolves to the
 * DEEPEST CATEGORY node (`catalogService.resolveCategoryId`), and in the vehicles
 * tree that node IS the body type — `cars`, `suv`, `motorcycles`, `truck`,
 * `electric-cars`. Brands and models hang off it as BRAND/MODEL nodes, so the
 * discriminator needs no path walk and no network call.
 *
 * An ALLOW-list, not a deny-list, so an unknown or newly seeded vehicle category
 * renders no diagram rather than the wrong one. That is the safe direction to
 * fail: a missing report is an omission, a car map on a boat is a false claim.
 * If the backend ever inserts a level between one of these and its brands, the
 * listing's category becomes the new node and its diagram disappears until the
 * slug is added here — visible, and the right way round.
 */
export const CAR_BODY_CATEGORY_SLUGS = new Set([
  'cars',              // سيارات للبيع
  'suv',               // دفع رباعي وبيك أب
  'minivan',           // ميني فان وفان
  'electric-cars',     // سيارات كهربائية
  'damaged-cars',      // سيارات متضررة — the report matters most here
  'damaged-suv',       // دفع رباعي وبيك أب متضررة
  'cars-for-rent',     // سيارات للإيجار
  'suv-for-rent',      // دفع رباعي وبيك أب للإيجار
  'minivan-for-rent',  // ميني فان وفان للإيجار
]);

/** Does this listing's category have a car body worth reporting panel-by-panel? */
export function hasCarBodyPanels(categorySlug?: string | null): boolean {
  return !!categorySlug && CAR_BODY_CATEGORY_SLUGS.has(categorySlug);
}

// ── Tech specs ────────────────────────────────────────────────────────────────

/**
 * A vehicle feature. `value` is the STORED identifier — it is what goes into
 * `listing.technicalSpecs[]` (a plain `string[]` on the API) and what every
 * already-saved listing contains. It is an API contract: never rename, never
 * translate at write time. `label_ar` is DISPLAY ONLY.
 */
export type TechSpecDef = { value: string; label_ar: string };

export const TECH_SPECS = {
  Safety: [
    { value: 'ABS',                          label_ar: 'نظام منع انغلاق المكابح (ABS)' },
    { value: 'EBD',                          label_ar: 'توزيع قوة الفرملة (EBD)' },
    { value: 'Electronic Stability Control', label_ar: 'نظام الثبات الإلكتروني (ESC)' },
    { value: 'Traction Control',             label_ar: 'نظام التحكم بالجر (TCS)' },
    { value: 'Hill Start Assist',            label_ar: 'مساعد الانطلاق على المرتفعات' },
    { value: 'Brake Assist',                 label_ar: 'مساعد الفرملة الطارئة' },
    { value: 'Driver Airbag',                label_ar: 'وسادة هوائية للسائق' },
    { value: 'Passenger Airbag',             label_ar: 'وسادة هوائية للراكب' },
    { value: 'Side Airbags',                 label_ar: 'وسائد هوائية جانبية' },
    { value: 'Curtain Airbags',              label_ar: 'وسائد هوائية ستائرية' },
    { value: 'Knee Airbag',                  label_ar: 'وسادة هوائية للركبة' },
    { value: 'Forward Collision Warning',    label_ar: 'تحذير التصادم الأمامي' },
    { value: 'Lane Departure Warning',       label_ar: 'تحذير مغادرة المسار' },
    { value: 'Lane Keep Assist',             label_ar: 'مساعد الحفاظ على المسار' },
    { value: 'Blind Spot Monitor',           label_ar: 'مراقبة النقطة العمياء' },
    { value: 'Rear Cross-Traffic Alert',     label_ar: 'تنبيه المرور الخلفي المتقاطع' },
    { value: 'Adaptive Cruise Control',      label_ar: 'مثبت سرعة تكيفي' },
    { value: 'Rear Camera',                  label_ar: 'كاميرا خلفية' },
    { value: 'Parking Sensors (Front)',      label_ar: 'حساسات ركن أمامية' },
    { value: 'Parking Sensors (Rear)',       label_ar: 'حساسات ركن خلفية' },
    { value: '360° Camera',                  label_ar: 'كاميرا محيطية 360°' },
  ],
  Interior: [
    { value: 'Leather Seats',                label_ar: 'مقاعد جلد' },
    { value: 'Heated Seats (Front)',         label_ar: 'مقاعد أمامية مدفأة' },
    { value: 'Heated Seats (Rear)',          label_ar: 'مقاعد خلفية مدفأة' },
    { value: 'Ventilated Seats',             label_ar: 'مقاعد مهواة' },
    { value: 'Massage Seats',                label_ar: 'مقاعد بخاصية المساج' },
    { value: 'Power Driver Seat',            label_ar: 'مقعد سائق كهربائي' },
    { value: 'Power Passenger Seat',         label_ar: 'مقعد راكب كهربائي' },
    { value: 'Memory Seats',                 label_ar: 'ذاكرة وضعيات المقاعد' },
    { value: 'Sunroof',                      label_ar: 'فتحة سقف' },
    { value: 'Panoramic Roof',               label_ar: 'فتحة سقف بانورامية' },
    { value: 'Automatic Climate Control',    label_ar: 'مكيف أوتوماتيكي' },
    { value: 'Dual-Zone Climate',            label_ar: 'تكييف بمنطقتين' },
    { value: 'Tri-Zone Climate',             label_ar: 'تكييف بثلاث مناطق' },
    { value: 'Navigation System',            label_ar: 'نظام ملاحة' },
    { value: 'Head-Up Display',              label_ar: 'شاشة عرض أمامية (HUD)' },
    { value: 'Digital Dashboard',            label_ar: 'لوحة عدادات رقمية' },
    { value: 'Wireless Charging',            label_ar: 'شحن لاسلكي' },
    { value: 'USB-A Ports',                  label_ar: 'منافذ USB-A' },
    { value: 'USB-C Ports',                  label_ar: 'منافذ USB-C' },
    { value: 'Ambient Lighting',             label_ar: 'إضاءة داخلية محيطية' },
  ],
  Exterior: [
    { value: 'Alloy Wheels',                 label_ar: 'جنوط ألمنيوم' },
    { value: '17" Wheels',                   label_ar: 'جنوط 17 بوصة' },
    { value: '18" Wheels',                   label_ar: 'جنوط 18 بوصة' },
    { value: '19" Wheels',                   label_ar: 'جنوط 19 بوصة' },
    { value: '20"+ Wheels',                  label_ar: 'جنوط 20 بوصة فأكثر' },
    { value: 'LED Headlights',               label_ar: 'مصابيح أمامية LED' },
    { value: 'Matrix LED Headlights',        label_ar: 'مصابيح LED ماتريكس' },
    { value: 'LED Taillights',               label_ar: 'مصابيح خلفية LED' },
    { value: 'Daytime Running Lights',       label_ar: 'أضواء نهارية (DRL)' },
    { value: 'Auto Headlights',              label_ar: 'إضاءة أمامية أوتوماتيكية' },
    { value: 'Fog Lights',                   label_ar: 'مصابيح ضباب' },
    { value: 'Cornering Lights',             label_ar: 'مصابيح انعطاف' },
    { value: 'Power-Folding Mirrors',        label_ar: 'مرايا كهربائية قابلة للطي' },
    { value: 'Heated Mirrors',               label_ar: 'مرايا مدفأة' },
    { value: 'Auto-Dimming Mirrors',         label_ar: 'مرايا ذاتية التعتيم' },
    { value: 'Keyless Entry',                label_ar: 'دخول بدون مفتاح' },
    { value: 'Keyless Start',                label_ar: 'تشغيل بزر (بدون مفتاح)' },
    { value: 'Power Tailgate',               label_ar: 'باب صندوق كهربائي' },
    { value: 'Roof Rails',                   label_ar: 'قضبان سقف' },
    { value: 'Tow Hook',                     label_ar: 'خطاف قطر' },
  ],
  Multimedia: [
    { value: 'AM/FM Radio',                  label_ar: 'راديو AM/FM' },
    { value: 'DAB+ Radio',                   label_ar: 'راديو رقمي DAB+' },
    { value: 'Bluetooth',                    label_ar: 'بلوتوث' },
    { value: 'Wi-Fi Hotspot',                label_ar: 'نقطة اتصال Wi-Fi' },
    { value: 'Apple CarPlay',                label_ar: 'آبل كاربلاي' },
    { value: 'Android Auto',                 label_ar: 'أندرويد أوتو' },
    { value: 'MirrorLink',                   label_ar: 'ميرور لينك' },
    { value: 'Premium Sound System',         label_ar: 'نظام صوتي ممتاز' },
    { value: 'Subwoofer',                    label_ar: 'مضخم صوت (سبويفر)' },
    { value: '8+ Speakers',                  label_ar: '8 سماعات فأكثر' },
    { value: 'Rear Entertainment Screen',    label_ar: 'شاشة ترفيه خلفية' },
    { value: 'Voice Control',                label_ar: 'تحكم صوتي' },
    { value: 'Steering Wheel Controls',      label_ar: 'أزرار تحكم على المقود' },
    { value: 'Wireless Phone Charging',      label_ar: 'شحن هاتف لاسلكي' },
    { value: 'Multiple USB Ports',           label_ar: 'منافذ USB متعددة' },
  ],
} as const satisfies Record<string, readonly TechSpecDef[]>;

export type TechSpecCategory = keyof typeof TECH_SPECS;

/** Arabic headers for the four feature sections — shared by the wizard and the detail page. */
export const TECH_SPEC_CATEGORY_AR: Record<TechSpecCategory, string> = {
  Safety:     'الأمان والسلامة',
  Interior:   'التصميم الداخلي',
  Exterior:   'المظهر الخارجي',
  Multimedia: 'الوسائط المتعددة',
};

/** Stored values per category — what actually goes into `technicalSpecs[]`. */
export const TECH_SPEC_VALUES: Record<TechSpecCategory, string[]> = Object.fromEntries(
  (Object.entries(TECH_SPECS) as [TechSpecCategory, readonly TechSpecDef[]][])
    .map(([cat, defs]) => [cat, defs.map((d) => d.value)]),
) as Record<TechSpecCategory, string[]>;

const TECH_SPEC_LABELS_AR: Record<string, string> = Object.fromEntries(
  Object.values(TECH_SPECS).flat().map((d) => [d.value, d.label_ar]),
);

/**
 * Display label for a stored feature value. Unknown values (older listings, or
 * a value the backend grew before we did) fall back to the raw string rather
 * than disappearing.
 */
export function techSpecLabel(value: string): string {
  return TECH_SPEC_LABELS_AR[value] ?? value;
}

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
