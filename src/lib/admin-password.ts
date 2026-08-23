/**
 * Mirror of the backend's `adminPassword` schema (admin-setup.schemas.ts, 3fb7e39).
 *
 * Deliberately stricter than the consumer `strongPassword` (8 + one A–Z + one digit),
 * which is untouched: a consumer account posts listings, an ADMIN account freezes users,
 * approves stores and moves wallet balances.
 *
 * THREE of four classes, not four — mandating every class is what produces «Password1!».
 * Length carries the entropy, hence 14.
 *
 * ⚠ Kept in lockstep with the backend by hand. This copy exists to give live feedback,
 * NOT to gate: the server is the authority and re-checks everything. If the two ever
 * drift, the server wins and its message is surfaced verbatim.
 */

export const ADMIN_PASSWORD_MIN_LENGTH = 14;
export const ADMIN_PASSWORD_MIN_CLASSES = 3;

const CLASSES: Array<[RegExp, string]> = [
  [/[a-z]/, 'حرف إنجليزي صغير (a–z)'],
  [/[A-Z]/, 'حرف إنجليزي كبير (A–Z)'],
  [/[0-9]/, 'رقم (0–9)'],
  [/[^a-zA-Z0-9]/, 'رمز (!@#$…)'],
];

/** Same list the backend screens against, in the same order. */
const COMMON_FRAGMENTS = [
  'password', 'passw0rd', 'qwerty', 'azerty', 'asdfgh', 'zxcvbn',
  '123456', '1234567890', '0987654321', 'abcdef', 'letmein', 'welcome',
  'admin123', 'administrator', 'iloveyou', 'monkey', 'dragon', 'sunshine',
  'forsa', 'fursago', 'syria', 'damascus',
];

/** Lowercased with non-alphanumerics stripped, so «P@ssw0rd1234!» still hits «password». */
const flatten = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');

export const adminClassesPresent = (value: string): number =>
  CLASSES.filter(([re]) => re.test(value)).length;

/** The common fragment this password contains, or null. */
export function adminCommonFragment(value: string): string | null {
  if (!value) return null;
  const flat = flatten(value);
  return COMMON_FRAGMENTS.find((f) => flat.includes(f)) ?? null;
}

export interface AdminPasswordCheck {
  label: string;
  ok: boolean;
  /** Rendered as a sub-line under the class rule so the four options stay visible. */
  detail?: string;
}

/**
 * The live checklist.
 *
 * The email-local-part rule is ABSENT on purpose: this page holds a token, never the
 * address, so the identity check cannot run here. The backend enforces it once the token
 * resolves the account and returns its own message, which the form surfaces.
 */
export function adminPasswordChecks(value: string): AdminPasswordCheck[] {
  const classes = adminClassesPresent(value);
  const fragment = adminCommonFragment(value);

  return [
    {
      label: `${ADMIN_PASSWORD_MIN_LENGTH} حرفاً على الأقل`,
      ok: value.length >= ADMIN_PASSWORD_MIN_LENGTH,
      detail: value.length > 0 ? `${value.length} حرفاً حتى الآن` : undefined,
    },
    {
      label: `${ADMIN_PASSWORD_MIN_CLASSES} من 4 أنواع: ${CLASSES.map(([, n]) => n).join('، ')}`,
      ok: classes >= ADMIN_PASSWORD_MIN_CLASSES,
      detail: value.length > 0 ? `${classes} من 4 حتى الآن` : undefined,
    },
    {
      label: 'لا يحتوي على تسلسل شائع أو اسم الموقع',
      ok: fragment === null,
      detail: fragment ? `يحتوي على «${fragment}»` : undefined,
    },
  ];
}

/** Does this password satisfy every rule we can check client-side? */
export const adminPasswordValid = (value: string): boolean =>
  adminPasswordChecks(value).every((c) => c.ok);
