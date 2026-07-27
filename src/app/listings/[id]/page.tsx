/**
 * Listing detail — SERVER wrapper.
 *
 * This file exists for one reason: `generateMetadata` (and the `metadata` export)
 * are **only supported in Server Components**, and the interactive detail page is
 * a 1700-line client component. Next's own guidance for exactly this case is to
 * keep `page.tsx` a server component and move the client logic to a sibling file
 * — which is all that happened here. `ListingDetailClient` is byte-identical to
 * the old page apart from its name and a comment; it still reads the id from
 * `useParams()`, so nothing had to be threaded through as props.
 *
 * WHY IT MATTERS: WhatsApp, Telegram and every social crawler fetch the URL and
 * parse the returned HTML **without running JavaScript**. Metadata rendered by a
 * client component simply does not exist for them — a shared link would show a
 * bare URL. Only server-rendered <head> tags produce a rich preview.
 *
 * On streaming: Next streams metadata by default, which would place these tags
 * after <head> is flushed. It does NOT break previews here, because Next's
 * built-in `htmlLimitedBots` list — which includes `WhatsApp`,
 * `facebookexternalhit`, `Twitterbot`, `Discordbot` and friends — forces a
 * blocking render for those user agents. No config needed. (Telegram is covered
 * incidentally: its UA is `TelegramBot (like TwitterBot)`, which matches the
 * `Twitterbot` alternative. If Telegram ever changes that string, add it to
 * `htmlLimitedBots` in next.config.ts.)
 */

import type { Metadata } from 'next';
import ListingDetailClient from './ListingDetailClient';
import {
  fetchListingForMetadata,
  buildListingMetadata,
} from './metadata';

// The listing is mutable (price edits, status changes, new photos), so metadata
// is resolved per request rather than frozen at build time.
export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  // Next 15+ hands params in as a promise.
  const { id } = await params;
  const listing = await fetchListingForMetadata(id);
  return buildListingMetadata(listing, id);
}

export default function ListingDetailPage() {
  return <ListingDetailClient />;
}
