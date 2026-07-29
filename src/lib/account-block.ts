// Account-block presentation: the codes the backend sends when a login (or any
// authenticated request) is refused because the account itself is blocked, and the Arabic
// the user reads for each.
//
// Backend contract (modules/auth/account-status.ts → describeAccountBlock):
//   { success: false, message: <English>, code: <one of these>, reason: <string|null> }
//   • POST /auth/login   → 403
//   • POST /auth/refresh → 403
//   • any authenticated request (requireAuth) → 401   ← the mid-session freeze
// `message` is an English fallback; the Arabic below is chosen from `code`. `reason` is
// the moderating admin's status_reason and is USER-FACING by decision — it is emitted even
// when null, so its absence means "no reason recorded", not "not sent".

export const ACCOUNT_BLOCK_CODES = ['ACCOUNT_SUSPENDED', 'ACCOUNT_BANNED', 'ACCOUNT_DELETED'] as const;

export type AccountBlockCode = (typeof ACCOUNT_BLOCK_CODES)[number];

export function isAccountBlockCode(code: unknown): code is AccountBlockCode {
  return typeof code === 'string' && (ACCOUNT_BLOCK_CODES as readonly string[]).includes(code);
}

export interface AccountBlock {
  code: AccountBlockCode;
  reason: string | null;
}

interface BlockCopy {
  title: string;
  body: string;
  /** Temporary framing gets a softer tone and an "it will be lifted" promise. */
  permanent: boolean;
}

export const ACCOUNT_BLOCK_COPY: Record<AccountBlockCode, BlockCopy> = {
  ACCOUNT_SUSPENDED: {
    title: 'تم إيقاف حسابك مؤقتاً',
    body: 'تم إيقاف حسابك مؤقتاً بسبب مخالفة. سيتم رفع الإيقاف في أقرب وقت — تواصل معنا للمزيد.',
    permanent: false,
  },
  ACCOUNT_BANNED: {
    title: 'تم حظر حسابك نهائياً',
    body: 'تم حظر حسابك نهائياً بسبب مخالفة الشروط. تواصل معنا إذا كان لديك اعتراض.',
    permanent: true,
  },
  ACCOUNT_DELETED: {
    title: 'تم حذف حسابك',
    body: 'تم حذف هذا الحساب ولم يعد بالإمكان الدخول إليه. تواصل معنا إذا كان لديك اعتراض.',
    permanent: true,
  },
};

// ── Transport across the mid-session redirect ─────────────────────────────────────
// A mid-session freeze is caught inside api.ts, which then hard-navigates to
// /account-blocked. The payload rides in sessionStorage rather than the query string:
// the admin's reason is free text and does not belong in a URL (it lands in history,
// referrers and server logs). sessionStorage is same-tab and dies with it.

const STORAGE_KEY = 'forsa-account-block';

export function stashAccountBlock(block: AccountBlock): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(block));
  } catch { /* private browsing — the screen falls back to its generic copy */ }
}

/** Reads AND clears, so a refresh of /account-blocked doesn't resurrect a stale block. */
export function takeAccountBlock(): AccountBlock | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    const parsed = JSON.parse(raw) as Partial<AccountBlock>;
    if (!isAccountBlockCode(parsed.code)) return null;
    return { code: parsed.code, reason: typeof parsed.reason === 'string' ? parsed.reason : null };
  } catch {
    return null;
  }
}

export const ACCOUNT_BLOCKED_PATH = '/account-blocked';
