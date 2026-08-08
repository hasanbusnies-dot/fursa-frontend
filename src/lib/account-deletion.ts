// Account-deletion presentation: the warning CODES the deletion preview returns, and
// the Arabic the user reads for each.
//
// Backend contract (GET /users/me/deletion-preview):
//   { wallet, stores, activeListings, pendingTopups, warnings: [CODE], reRegistrationPhone }
// Same split as AccountBlockCode (lib/account-block.ts): the API sends codes, the
// frontend owns the wording. An unrecognised code renders nothing rather than leaking
// a raw identifier into an Arabic screen — a new backend code is a copy task here, and
// until it lands the user is better served by silence than by "STORE_SUSPENDED".
//
// These are WARNINGS, not blocks. Every one of them still lets the user proceed; the
// preview exists so the decision is INFORMED, not so it can be refused.

export const DELETION_WARNING_CODES = [
  'WALLET_BALANCE',
  'ACTIVE_MEMBERSHIP',
  'STORE_SUSPENDED',
  'LISTINGS_HIDDEN',
  'PENDING_TOPUPS',
] as const;

export type DeletionWarningCode = (typeof DELETION_WARNING_CODES)[number];

/**
 * `money` warnings cost the user something they cannot get back by re-registering, so
 * they are ranked first and drawn in amber. Everything else is a consequence they
 * should know about but that costs them nothing recoverable — those stay neutral, so
 * the amber keeps meaning "there is value here you are about to strand".
 */
interface WarningCopy {
  title: string;
  body: string;
  money: boolean;
}

export const ACCOUNT_DELETION_WARNING_COPY: Record<DeletionWarningCode, WarningCopy> = {
  WALLET_BALANCE: {
    title: 'لديك رصيد في المحفظة',
    body: 'سيصبح رصيدك غير قابل للوصول بعد الحذف. يُنصح بإنفاقه أو سحبه أولاً.',
    money: true,
  },
  PENDING_TOPUPS: {
    title: 'لديك عمليات شحن قيد المعالجة',
    body: 'لن تُضاف هذه المبالغ إلى حسابك بعد الحذف. انتظر اكتمالها أو تواصل معنا أولاً.',
    money: true,
  },
  ACTIVE_MEMBERSHIP: {
    title: 'لديك اشتراك متجر ساري',
    body: 'ينتهي اشتراكك بحذف الحساب، ولا يُسترد ما تبقّى من مدته.',
    money: true,
  },
  STORE_SUSPENDED: {
    title: 'لديك متجر موقوف',
    body: 'حذف الحساب لا يرفع الإيقاف ولا ينهي أي إجراء قائم بشأنه.',
    money: false,
  },
  LISTINGS_HIDDEN: {
    title: 'سيتم إخفاء إعلاناتك',
    body: 'تختفي إعلاناتك من الموقع فوراً ولا يمكن استرجاعها لاحقاً.',
    money: false,
  },
};

export function isDeletionWarningCode(code: unknown): code is DeletionWarningCode {
  return typeof code === 'string' && (DELETION_WARNING_CODES as readonly string[]).includes(code);
}

/**
 * Known codes only, money first — so the thing with a price tag is never below the
 * fold on a phone. Order within each group follows DELETION_WARNING_CODES, which puts
 * the wallet balance above the pending top-ups.
 */
export function orderedWarnings(codes: string[] | undefined): DeletionWarningCode[] {
  const known = (codes ?? []).filter(isDeletionWarningCode);
  const seen = new Set<DeletionWarningCode>();
  const unique = known.filter((c) => (seen.has(c) ? false : (seen.add(c), true)));
  return unique.sort((a, b) => {
    const byMoney = Number(ACCOUNT_DELETION_WARNING_COPY[b].money) - Number(ACCOUNT_DELETION_WARNING_COPY[a].money);
    if (byMoney !== 0) return byMoney;
    return DELETION_WARNING_CODES.indexOf(a) - DELETION_WARNING_CODES.indexOf(b);
  });
}

// ── Reason picker ─────────────────────────────────────────────────────────────
// Optional by contract. Kept to the backend's three values — a free-text box here
// would collect complaints nobody is staffed to read, which is worse than not asking.

export const DELETION_REASONS = [
  { value: 'NO_LONGER_NEEDED', label: 'لم أعد بحاجة للتطبيق' },
  { value: 'PRIVACY',          label: 'مخاوف الخصوصية' },
  { value: 'OTHER',            label: 'أخرى' },
] as const;

// ── What deletion actually does ───────────────────────────────────────────────
// Stated in full on the confirm step, because "are you sure?" is not consent — this
// is. The re-registration line is the one users most often get wrong, so it is last
// and it says BOTH halves: the phone works again, the account does not come back.

export const DELETION_CONSEQUENCES = [
  'يتم إيقاف حسابك وإخفاء ملفك الشخصي.',
  'تختفي جميع إعلاناتك من الموقع.',
  'يُجمَّد رصيد محفظتك ولا يمكنك الوصول إليه.',
  'تفقد رسائلك وعروضك ومفضّلاتك.',
] as const;

export const DELETION_REREGISTER_NOTE =
  'يمكنك التسجيل مجدداً بنفس الرقم لاحقاً، لكن كحساب جديد — لن تعود إعلاناتك أو رصيدك أو سجلك.';

// ── Farewell hand-off ─────────────────────────────────────────────────────────
// The success screen CANNOT live in the settings page: deletion revokes every token,
// so the moment the session is cleared that page redirects to /login, and if it were
// left authenticated instead, the header's 10-second unread poll would 401 with
// ACCOUNT_DELETED and api.ts would hard-navigate to /account-blocked — an appeals
// screen, which is the wrong ending for something the user chose.
//
// So the flow logs out immediately and hands off to /account-deleted, carrying the
// payload through sessionStorage exactly like stashAccountBlock: the freed phone is
// personal data and has no business in a URL, where it would land in history and
// server logs. Read-once, so a refresh doesn't resurrect it.

const FAREWELL_KEY = 'forsa-account-deleted';

export interface DeletionFarewell {
  freedPhone: string | null;
}

export function stashDeletionFarewell(f: DeletionFarewell): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(FAREWELL_KEY, JSON.stringify(f));
  } catch { /* private browsing — the screen falls back to its generic copy */ }
}

export function takeDeletionFarewell(): DeletionFarewell | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(FAREWELL_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(FAREWELL_KEY);
    const parsed = JSON.parse(raw) as Partial<DeletionFarewell>;
    return { freedPhone: typeof parsed.freedPhone === 'string' ? parsed.freedPhone : null };
  } catch {
    return null;
  }
}

export const ACCOUNT_DELETED_PATH = '/account-deleted';
