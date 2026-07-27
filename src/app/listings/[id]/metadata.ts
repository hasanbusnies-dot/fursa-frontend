/**
 * Server-side metadata for the listing detail route.
 *
 * Split out of `page.tsx` so the fetch and the tag-building are testable and so
 * the page file stays a thin server shell over the client component.
 */

import type { Metadata } from 'next';
import type { Listing } from '@/types';
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_SIZE,
  isShareable,
  listingUrl,
  shareSubtitle,
} from '@/lib/share';

const SITE_NAME = 'فرصة | fursago';
const GENERIC_TITLE = 'إعلان على فرصة';
const GENERIC_DESCRIPTION =
  'فرصة — سوق الإعلانات المبوبة في سوريا. بيع واشترِ كل شيء بسهولة.';

/**
 * Fetch just enough of the listing to build tags.
 *
 * Uses a plain `fetch` rather than `services/api.ts` on purpose: that wrapper
 * carries realm resolution, token reading and 401-redirect behaviour that mean
 * nothing on a crawler request, and `GET /listings/:id` is public (verified: 200
 * with no auth header). Never throws — a metadata failure must degrade to a
 * generic card, never take the page down with it.
 */
export async function fetchListingForMetadata(id: string): Promise<Listing | null> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return null;
  try {
    const res = await fetch(`${base}/listings/${encodeURIComponent(id)}`, {
      // Short shared cache: a crawler and a human hitting the same URL within a
      // few seconds shouldn't cost two upstream calls, but a price edit should
      // surface quickly.
      next: { revalidate: 60 },
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const body = await res.json();
    // REST endpoints return { success, data }; tolerate a bare object too.
    return (body?.data ?? body) as Listing;
  } catch {
    return null;
  }
}

/** Primary photo, else the first, else null. Absolute Supabase URLs already. */
function primaryImageUrl(listing: Listing): string | null {
  const images = listing.images ?? [];
  const primary = images.find((i) => i.isPrimary) ?? images[0];
  const url = primary?.url?.trim();
  // Only absolute https survives: a relative path would resolve against
  // metadataBase and 404 for the crawler.
  return url && /^https?:\/\//i.test(url) ? url : null;
}

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Build the tag set.
 *
 * Two shapes only:
 *  · ACTIVE listing  → full card: title, price+location description, its photo.
 *  · anything else   → generic card, NO listing photo, and `noindex`. Covers a
 *    missing listing, a fetch failure, and — the case that actually matters —
 *    a PENDING_REVIEW/REJECTED listing, which the backend still serves publicly.
 */
export function buildListingMetadata(listing: Listing | null, id: string): Metadata {
  const url = listingUrl(id);

  if (!listing || !isShareable(listing.status)) {
    return {
      title: GENERIC_TITLE,
      description: GENERIC_DESCRIPTION,
      alternates: { canonical: url },
      // Never let an unapproved or missing listing into an index or a rich card.
      robots: { index: false, follow: false },
      openGraph: {
        type: 'website',
        siteName: SITE_NAME,
        title: GENERIC_TITLE,
        description: GENERIC_DESCRIPTION,
        url,
        locale: 'ar_AR',
        images: [{ url: DEFAULT_OG_IMAGE, ...DEFAULT_OG_IMAGE_SIZE, alt: SITE_NAME }],
      },
      twitter: {
        card: 'summary',
        title: GENERIC_TITLE,
        description: GENERIC_DESCRIPTION,
        images: [DEFAULT_OG_IMAGE],
      },
    };
  }

  const title = truncate(listing.title, 80);
  const subtitle = shareSubtitle({
    title: listing.title,
    price: listing.price,
    currency: listing.currency,
    city: listing.city,
  });
  const body = listing.description ? truncate(listing.description, 140) : '';
  const description = truncate([subtitle, body].filter(Boolean).join(' — '), 200)
    || GENERIC_DESCRIPTION;

  const photo = primaryImageUrl(listing);

  // A listing photo is whatever the seller uploaded — portrait, tiny, anything.
  // Declaring `summary_large_image` for one of those gets it centre-cropped into
  // a banner, so the large card is claimed ONLY for the branded 1200×630 default,
  // whose dimensions actually fit it.
  const image = photo
    ? { url: photo, alt: title }
    : { url: DEFAULT_OG_IMAGE, ...DEFAULT_OG_IMAGE_SIZE, alt: SITE_NAME };

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      // 'website' rather than 'product': the OG product type wants price/currency
      // structured properties, and a half-filled product object previews worse in
      // WhatsApp than a clean website card.
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale: 'ar_AR',
      images: [image],
    },
    twitter: {
      card: photo ? 'summary' : 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
  };
}
