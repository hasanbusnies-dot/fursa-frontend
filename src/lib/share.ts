/**
 * Sharing + canonical-URL helpers.
 *
 * Deliberately dependency-free and client-safe so the SERVER metadata layer
 * (`app/listings/[id]/metadata.ts`) and the CLIENT share button can agree on the
 * same URL and the same text. Two implementations would drift, and the one place
 * that must not drift is the URL a crawler sees (`og:url`) versus the URL a
 * seller actually pastes into WhatsApp.
 */

import { formatPrice } from './utils';

/**
 * Public origin, no trailing slash.
 *
 * MUST be set in the environment for production: it becomes `metadataBase` and
 * therefore `og:url` and the absolute fallback image URL. Without it Next
 * resolves relative metadata URLs against localhost, which would ship
 * `og:image: http://localhost:3000/...` — a preview that silently renders blank
 * for every recipient. The literal default is the production origin rather than
 * localhost so a missed env var degrades to "correct in prod" instead of
 * "broken in prod".
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.fursago.com'
).replace(/\/+$/, '');

/**
 * Branded 1200×630 card used when a listing has no photo of its own — which is a
 * real case in live data, not a defensive hypothetical. Without it those
 * listings preview as a bare link.
 */
export const DEFAULT_OG_IMAGE = '/og-default.png';
export const DEFAULT_OG_IMAGE_SIZE = { width: 1200, height: 630 };

/**
 * Canonical public path for a listing.
 *
 * The id (UUID) — not the slug and not the ad number. `slug` is null on live
 * listings, and `listingNumber` has no route of its own (it is search-only), so
 * this is the only form that resolves. A prettier `/i/<listingNumber>` short
 * link is tracked in FOLLOWUPS.md.
 */
export function listingPath(id: string): string {
  return `/listings/${id}`;
}

export function listingUrl(id: string): string {
  return `${SITE_URL}${listingPath(id)}`;
}

/**
 * Only ACTIVE listings are shareable, and only they get real OG tags.
 *
 * This is not cosmetic: the backend's `findById` serves every status except
 * DELETED, so a PENDING_REVIEW or REJECTED listing is publicly fetchable by URL.
 * Ungated, `generateMetadata` would mint an indexable rich card carrying an
 * unapproved listing's photo and price.
 */
export function isShareable(status?: string | null): boolean {
  return status === 'ACTIVE';
}

export interface ShareSubject {
  title: string;
  price?: number | null;
  currency?: 'SYP' | 'USD' | null;
  city?: string | null;
}

/** «19,900 ل.س — إدلب», dropping whichever half is missing. */
export function shareSubtitle({ price, currency, city }: ShareSubject): string {
  const parts: string[] = [];
  if (price != null && Number.isFinite(price)) {
    parts.push(formatPrice(price, currency ?? 'SYP'));
  }
  const c = city?.trim();
  if (c) parts.push(c);
  return parts.join(' — ');
}

/**
 * The message body — WITHOUT the URL.
 *
 * Kept separate because `navigator.share` takes `text` and `url` as distinct
 * fields, and several Android targets concatenate both: folding the URL into
 * `text` makes the link appear twice in the sent message. Callers that need one
 * string (wa.me, clipboard) join them explicitly, URL last — WhatsApp previews
 * the final URL in a message.
 */
export function shareText(subject: ShareSubject): string {
  const sub = shareSubtitle(subject);
  return sub ? `${subject.title}\n${sub}` : subject.title;
}

/** One string, URL last. For wa.me / Telegram / any single-field target. */
export function shareTextWithUrl(subject: ShareSubject, url: string): string {
  return `${shareText(subject)}\n${url}`;
}

/** WhatsApp deep link. `wa.me` (no phone) opens the contact picker. */
export function whatsAppShareUrl(subject: ShareSubject, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(shareTextWithUrl(subject, url))}`;
}

/** Telegram deep link — separate `url` and `text` fields, so no duplication. */
export function telegramShareUrl(subject: ShareSubject, url: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(
    shareText(subject),
  )}`;
}

/**
 * Copy text to the clipboard, reporting whether it worked.
 *
 * `navigator.clipboard` needs a SECURE CONTEXT: it is present on https and on
 * localhost, and absent over a LAN IP — which is exactly how a phone reaches the
 * dev server. Returning false (rather than throwing) lets the caller show a
 * useful message instead of a dead button.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Is the OS share sheet available? Secure-context only, same as the clipboard. */
export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}
