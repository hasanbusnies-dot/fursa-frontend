// Canonical Arabic labels for the staff-facing areas (admin / accounting / agent).
// Single source of truth so the same concept reads identically everywhere — import
// these instead of re-typing status words inline. Visual styling (colours, icons)
// stays with each page; only the human-readable text lives here.

/** Listing moderation lifecycle. */
export const LISTING_STATUS_AR: Record<string, string> = {
  ACTIVE:         'نشط',
  PENDING_REVIEW: 'قيد المراجعة',
  PENDING:        'قيد الانتظار',
  REJECTED:       'مرفوض',
  SOLD:           'مُباع',
  INACTIVE:       'غير نشط',
};

/** Store moderation status. */
export const STORE_STATUS_AR: Record<string, string> = {
  PENDING:   'قيد الانتظار',
  APPROVED:  'مُعتمد',
  REJECTED:  'مرفوض',
  SUSPENDED: 'موقوف',
};

/** Subscription-renewal state. */
export const RENEWAL_STATE_AR: Record<string, string> = {
  LAPSED:   'متأخر',
  UPCOMING: 'مستحق قريباً',
  ACTIVE:   'نشط',
  NONE:     'بلا اشتراك',
};

/** Wallet manual-transfer top-up method (provider brand names stay as-is). */
export const TRANSFER_METHOD_AR: Record<string, string> = {
  SHAM_CASH:     'Sham Cash',
  MTN_CASH:      'MTN Cash',
  SYRIATEL_CASH: 'Syriatel Cash',
};

/** Membership payment method. */
export const PAYMENT_METHOD_AR: Record<string, string> = {
  ONLINE: 'إلكتروني',
  CASH:   'نقداً',
  FREE:   'مجاني',
};

/** Membership pricing campaign. */
export const CAMPAIGN_AR: Record<string, string> = {
  FULL_PRICE:       'السعر الكامل',
  DISCOUNT_33:      'خصم 33%',
  FIRST_MONTH_FREE: 'الشهر الأول مجاناً',
};

/** Agent cash-collection verification status. */
export const VERIFICATION_STATUS_AR: Record<string, string> = {
  PENDING_VERIFICATION: 'قيد التحقق',
  VERIFIED:             'مُتحقَّق',
  REJECTED:             'مرفوض',
};

/** Manual-transfer top-up status (accounting queue). */
export const TRANSFER_STATUS_AR: Record<string, string> = {
  PENDING_VERIFICATION: 'بانتظار الاعتماد',
  CONFIRMED:            'مُعتمد',
  REJECTED:             'مرفوض',
  INITIATED:            'بدأت',
};

/** Settlement state of a collection (settled / not yet reconciled with HQ). */
export const SETTLEMENT_AR = {
  settled:   'مسوّى',
  unsettled: 'غير مسوّى',
} as const;

/** Canonical Arabic for the standard (system) expense categories. Custom categories
 *  fall back to their server-provided label — use expenseCategoryLabel(). */
export const EXPENSE_CATEGORY_AR: Record<string, string> = {
  salary:      'رواتب',
  servers:     'خوادم',
  advertising: 'دعاية وإعلان',
  tax:         'ضرائب',
  office:      'مصاريف المكتب',
  other:       'أخرى',
};

/** Localize a category by key, falling back to the backend label for custom keys. */
export function expenseCategoryLabel(key: string, fallback: string): string {
  return EXPENSE_CATEGORY_AR[key] ?? fallback;
}

/** Common UI strings reused across the staff pages. */
export const UI_AR = {
  // actions
  approve: 'اعتماد',
  reject:  'رفض',
  confirm: 'تأكيد',
  cancel:  'إلغاء',
  save:    'حفظ',
  saving:  'جارٍ الحفظ…',
  edit:    'تعديل',
  delete:  'حذف',
  update:  'تحديث',
  retry:   'إعادة المحاولة',
  // states
  loading:      'جارٍ التحميل…',
  loadFailed:   'تعذّر التحميل.',
  actionFailed: 'فشلت العملية.',
  // filters / pagination
  all:  'الكل',
  prev: 'السابق',
  next: 'التالي',
  page: 'صفحة',
} as const;
