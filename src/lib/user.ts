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
