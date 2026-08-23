import type { User } from '@/types';

/**
 * What to call this account on screen.
 *
 * A CORPORATE user has no person name — the backend puts `companyName` in the profile
 * block instead of firstName/lastName. Interpolating the name fields directly is why
 * businesses used to render as the literal string "undefined undefined" in the account
 * sidebar. Order: company name → person name → email local part → fallback.
 */
export function displayNameOf(user: User | null | undefined, fallback = ''): string {
  if (!user) return fallback;

  const company = user.corporateProfile?.companyName ?? user.profile?.companyName;
  if (company?.trim()) return company.trim();

  const person = [user.profile?.firstName, user.profile?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (person) return person;

  return user.email?.split('@')[0] ?? fallback;
}

/** First character for an avatar circle, with a safe placeholder. */
export function initialOf(user: User | null | undefined): string {
  return displayNameOf(user).charAt(0).toUpperCase() || '؟';
}

/** Any counterparty as the non-auth payloads serve them. */
export interface PartyLike {
  individualProfile?: { firstName?: string; lastName?: string } | null;
  corporateProfile?: { companyName?: string } | null;
  /** Legacy/auth shape, kept so a payload that still sends `profile` resolves. */
  profile?: { firstName?: string; lastName?: string } | null;
}

/**
 * What to call the OTHER party — a chat counterparty or a listing's seller.
 *
 * Distinct from `displayNameOf`, which reads `user.profile`: that key exists only
 * on the auth responses (/me, login). Messaging rooms and listing detail serve
 * `individualProfile` / `corporateProfile` instead, so reading `profile` there
 * yielded undefined and fell through to the hardcoded role literal — every
 * conversation rendered as «البائع» and every private seller as «بائع فردي».
 *
 * Corporate is detected by the presence of `corporateProfile`, NOT by
 * `userType === 'USER'`: the API sends 'INDIVIDUAL', so that comparison is dead.
 *
 * MASKING: the backend masks deleted/banned parties before serving them —
 * firstName «مستخدم محذوف», lastName ''. Joining first+last therefore reproduces
 * the mask exactly, with no special case here. Never source a party's name from
 * any other field: doing so routes around that masking and un-deletes the name.
 *
 * `fallback` is the caller's role label («البائع» / «المشتري» / «بائع فردي»),
 * used only when the payload carried no profile block at all.
 */
export function partyName(party: PartyLike | null | undefined, fallback = ''): string {
  if (!party) return fallback;

  const company = party.corporateProfile?.companyName;
  if (company?.trim()) return company.trim();

  const person = party.individualProfile ?? party.profile;
  const full = `${person?.firstName ?? ''} ${person?.lastName ?? ''}`.trim();

  return full || fallback;
}
