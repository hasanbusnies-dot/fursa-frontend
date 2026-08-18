# Follow-ups (tracked, not dropped)

## Refresh token in localStorage — POST-LAUNCH STRUCTURAL ITEM (logged 2026-07-29)
`auth.store.ts` persists `user`, `token` AND `refreshToken` to localStorage via
zustand `persist`, for all four realms (`forsa-auth`, `forsa-{admin,agent,
accounting}-auth`). The `forsa-token` cookie is deliberately NOT httpOnly because
`api.ts` getToken reads it from JS. Consequence: any XSS on the origin exfiltrates
a LONG-LIVED refresh token, not just a short access token.

Done at launch (cheap half): the cookie now carries `Secure` on https origins
(omitted on http so the LAN-IP dev origin keeps working) and stays `SameSite=Lax`
(Strict would withhold it when arriving from a shared WhatsApp/Telegram link).

The real fix is a backend contract change, NOT a frontend tweak: move the refresh
token into an httpOnly+Secure cookie set by the API, have `/auth/refresh` read it
from the cookie instead of the request body, and drop `refreshToken` from the
persisted store (keeping the access token in memory only). That touches login,
refresh, logout and all four realms — schedule it as its own project.

## No server-side route gating exists at all (logged 2026-07-29)
`src/proxy.ts` was DELETED: its only surviving matcher was `/dashboard/:path*`, a
route that has never existed (commit a9c519c moved the real `/listings/create`
guard client-side to fix a redirect loop, leaving the file vestigial). Removing
just the matcher was not an option — with no matcher Next runs the proxy on every
route, which would have redirected every anonymous visitor to /login.

So every guard in this app is now client-side, and the ONLY real authorization
boundary is the backend API (staff routers require auth server-side — confirmed).
Staff portal pages serve a 200 shell unauthenticated, which leaks no data. If
server-side gating is ever wanted, add a fresh `src/proxy.ts` with an EXPLICIT
matcher listing real routes, and remember the role lives in localStorage where a
proxy cannot see it — only the `forsa-token` cookie is visible there.

## TWA: real SHA-256 fingerprint into assetlinks.json — BLOCKS Play verification (logged 2026-07-29)
`public/.well-known/assetlinks.json` ships with two values that MUST be settled
at Play Console upload time:
- `sha256_cert_fingerprints[0]` is the literal placeholder
  `REPLACE_WITH_SHA256_FINGERPRINT_FROM_PLAY_CONSOLE_APP_INTEGRITY`. Take the
  real value from **Play Console → Setup → App integrity → App signing key
  certificate** (the PLAY APP SIGNING key — *not* the local upload/keystore
  cert; using the upload cert is the classic cause of a TWA launching with the
  browser URL bar still visible).
- `package_name` is `app.fursago.twa` — chosen as a sensible default. It is
  permanent once published, so change it here BEFORE the first upload if the
  founder wants something else, and keep it identical to the Bubblewrap config.

Verify after deploy: `https://www.fursago.com/.well-known/assetlinks.json`
returns 200 as `application/json` with NO redirect (the apex 301s to www — the
TWA must be built against the www host that serves this file directly).

## Full-app i18n / multi-language support — POST-LAUNCH PROJECT (logged 2026-07-28)
The app is Arabic-hardcoded end to end: literal Arabic strings inline in every
component, `dir="rtl"` + `lang="ar"` on the root layout, RTL-only layout
assumptions (logical properties everywhere, but also RTL-native behaviours like
the gallery's scroll-snap direction), Arabic-only enum→label maps
(`ENUM_AR`, `STATUS_LABELS`, `TECH_SPECS[].label_ar`, …) and Arabic catalog
copy served by the backend. Real i18n therefore means migrating the whole app
(string extraction into a message catalog, a locale router/segment, per-locale
`dir`, plus a backend-side story for catalog/category names) — not a component
change. That is a separate project, deliberately NOT started before launch.

What was done instead (2026-07-28): the 76 vehicle features in
`src/components/listings/wizard/schema.ts` gained an `label_ar` display field
while keeping the English `value` as the stored identifier. That pattern —
stable English key, Arabic label beside it — is the shape any future i18n
migration should generalise (`label_ar` → `labels: { ar, en, … }`), so it is a
step toward i18n rather than something to undo.

## PWA/TWA pre-splash ↔ our splash alignment — DONE for the image splash 2026-07-22
Chrome/Android shows its manifest-derived launch screen (background_color +
icon; not removable for installed PWAs) BEFORE the web app loads and our splash
plays. Aligned: `manifest.background_color` is now `#ffcb00` — the dominant
yellow of the image splash (`fursago.webp`) — so the two screens read as one
continuous yellow sequence. REVISIT if the deferred VIDEO splash returns
(`/splash.mp4` kept in the repo): re-align background_color to the video's
first frame then.

## 0. Purchase-modal copy for extend-not-overwrite dopings — waiting on backend
Backend is shipping extend-not-overwrite: buying a doping type that is already active
EXTENDS remaining + purchased weeks instead of overwriting. Once it lands, the purchase
modal should say so when the owner already has that type live:
«لديك X يوم متبقٍ من هذا الدوبينغ — سيتم إضافة المدة الجديدة إلى المتبقي.»
X computes from the owner payload's `activeDopings` (already available; passed to the
modal from my-listings / the dopings hub). Do NOT add this copy before the backend
commit — until then it would describe behavior that doesn't exist yet.

These were deliberately deferred from the refresh-token work (Yaklaşım A — balanced
foundation). They are architectural hardening items, not blockers. Each is safe to do
independently.

## 1. httpOnly-cookie refresh token (the XSS-safe solution) — HIGH VALUE
**Problem:** the refresh token is currently stored in `localStorage['forsa-auth']`, which
is readable by any XSS. A stolen rotating refresh token = up to a 7-day session hijack.

**Fix (requires backend + frontend + CORS):**
- Backend: on login/register/refresh, set the refresh token as an `httpOnly`, `Secure`,
  `SameSite=Lax` (or `None` if cross-site) cookie instead of (or in addition to) the JSON
  body. Make `POST /auth/refresh` and `POST /auth/logout` read the refresh token from the
  cookie when present.
- Frontend: stop persisting `refreshToken` in `localStorage`; call `/auth/refresh` with
  `credentials: 'include'` and no body. `src/services/token-refresh.ts` and `auth.store.ts`
  shrink accordingly.
- CORS: backend must allow credentials for the frontend origin; the socket already uses
  `withCredentials: true`, so the cookie would flow to the socket handshake too.

## 2. Backend: hash refresh tokens at rest (SHA-256) — HIGH VALUE
**Problem:** `forsa-backend` stores refresh tokens in plaintext
(`prisma.refreshToken.findFirst({ where: { token: rawToken } })`). A DB leak exposes every
live session.

**Fix (backend only):** store `sha256(rawToken)`; on lookup, hash the presented token and
compare. The wire format (opaque hex) stays the same, so the frontend is unaffected.

## 3. ~~Full cross-tab single-flight refresh~~ — DONE 2026-07-17
Implemented via Web Locks in `token-refresh.ts` (`refreshWithCrossTabLock`): the network
refresh runs under a browser-wide `forsa-refresh` lock; waiting tabs re-read the persisted
tokens after acquiring it and adopt instead of rotating again. Browsers without Web Locks
fall back to in-tab single-flight (covered by the failed-token comparison + the backend's
rotation grace window).

## 4. "Message a seller" without a listing context — MEDIUM
**Where:** `src/app/account/favorite-sellers/page.tsx:159` links to `/messages?to=${seller.id}`.

**Problem:** the conversation model is keyed by **listing** —
`messagesService.createOrGetRoom(listingId)` requires a `listingId`. The favorite-sellers
entry only has a seller id, so there is no conversation to open. The old `/messages` view
never handled the `?to=` param anyway (it only read `?roomId=`), and that view is now a
redirect — so this link currently lands the user on the conversation **list**, not a chat.

**Decision needed (product):** how should "message a seller" work with no listing? Options:
- Open a seller-level (listing-agnostic) conversation — needs a backend change to support
  conversations without a listing.
- Or change the UX to require picking one of the seller's listings first.

Until decided, the link is left as-is (it degrades to the messages list via the redirect).
Deferred during the entry-point repointing (Option a) change.

---
_Owner: messaging/auth refactor. Raised during the Socket.io migration groundwork._

## 5. Maskable PWA icon (Android adaptive icon) — RESOLVED 2026-07-22
Resolved with the fursago icon set: `public/fursago-icon-maskable-{192,512}.png` (lockup at
58% width inside the adaptive safe zone, flat #ffcb00) declared with `purpose: 'maskable'`
in `src/app/manifest.ts`, alongside `purpose: any` variants at 78% width. All four generated
from `public/fursago.png` so Chrome's PWA launch splash matches the in-app image splash.

## Stitch redesign deferrals (2026-07-10, uncommitted redesign build)
Deferred on purpose while applying the DESIGN.md system; none block the local review.

- **Raw-input stragglers:** the 3 dominant raw-input class patterns (251 of ~263
  instances, mostly FilterSidebar) were converted to the spec style (12px radius,
  `#F2F4F6` fill, blue 4px glow). ~10 one-off variants remain (wizard price/title
  fields with `rounded-xl` + orange rings) — converge them onto `Input`/shared
  classes when touching those screens.
- **Inner card images at 12px radius:** applied to the detail-page gallery, its
  thumbnails, and browse-table thumbs. ListingCard/FeaturedSection images stay
  flush-bleed (clipped by the 20px card radius) — revisit per-card if the inset
  look is wanted.
- **DESIGN.md type scale:** spec body is 16–18px; we kept the deliberate compact
  13px/12px root dial and adopted only the font pairing (Cairo headings/Tajawal body).
  Revisit density after the human reviews.
- **FeaturedSection copy is Turkish** ("Vitrin İlanları", "Günün Fırsatları",
  "Tümünü Gör") — pre-existing, should become Arabic like the rest of the UI.
- **Popover/modal Level-3 treatment** (1px 10% primary outline + deep soft shadow)
  not yet applied to dropdowns/modals.

## Account settings Phase 2 deferrals (2026-07-12)

- **Profile photo removal:** the PATCH schemas validate `avatarUrl`/`logoUrl` as URLs, so
  `''`/`null` can't clear a photo. Needs backend `z.literal('').transform(() => null)` (or
  `.nullable()`) + a small «إزالة الصورة» button in the settings PhotoSection.
- **Photo cropping:** no client-side crop — users upload as-is (min 480×480 enforced).
  Add a square-crop step if avatars start looking off-center in circular masks.
- **Avatar in header/sidebar:** Header + AccountSidebar still render initials only; the
  login response already carries `profile.avatarUrl`/`logoUrl`, so wiring the image in is
  frontend-only.
- **Supabase `temp/` prefix:** avatars (like listing images) live under `temp/` in the
  `forsa-images` bucket because `POST /upload` puts everything there and no cleanup job
  exists. If a temp-cleanup job is ever added pre-launch, it MUST skip URLs referenced by
  listings/profiles — or uploads should move to a permanent prefix first.

## Listing map — deferred out of Phase 1 (2026-07-25)

Phase 1 shipped read-only display of a coordinate that already exists on the listing
(`ListingMap.tsx` + the location tab). What it deliberately did NOT include:

- ~~**No coordinate picker in the add-listing wizard / edit page.**~~ **RESOLVED in
  Phase 2** (same day): `ListingMapPicker` is mounted in `Step2AdDetails` and in
  `/listings/edit/[id]`, so sellers set and correct their own pins. See the Phase 2
  section at the end of this file for what that left open.
- **No map on browse/search** (no results-map toggle, no bbox filtering). The backend
  already keeps a PostGIS point column, so a "search this area" view is a backend-query
  feature, not a rendering one.
- **No geocoding** (address → coords or reverse). The address line above the map is the
  raw neighborhood/district/city/governorate the seller typed; it is never derived from
  the pin, and the pin is never derived from the text.
- **Provider is swappable but unmonitored:** OpenFreeMap has no usage cap and no SLA.
  `MAP_STYLE_URL` in `src/lib/map.ts` (overridable via `NEXT_PUBLIC_MAP_STYLE_URL`) is the
  single swap point if it degrades — MapTiler/Protomaps/self-hosted all drop in there.
- **Three map runtime files are vendored into `public/vendor/`** and copied by
  `scripts/vendor-map-assets.mjs`, which `predev`/`prebuild` run so they cannot drift from
  the installed version:
  - `mapbox-gl-rtl-text.js` — Arabic glyph shaping, kept off unpkg so no third-party
    origin sits in the runtime path (BSD; license file alongside).
  - `maplibre/maplibre-gl-worker.mjs` + `maplibre/maplibre-gl-shared.mjs` — worked around
    a **Turbopack/maplibre v6 incompatibility**: Turbopack rewrites `import.meta.url` to a
    `file://` string, maplibre's worker-URL resolver bails to `''` on a non-http scheme,
    and `new Worker('', {type:'module'})` then fetches the current document — the map dies
    with "non-JavaScript MIME type of 'text/html'". `setWorkerUrl(MAP_WORKER_URL)` in
    `ListingMap.tsx` bypasses the bundler. Broken identically in dev and prod builds.
    (Turbopack's own fallback resolved the worker to `maplibre-gl-dev.mjs` — the whole
    library — so it was wrong even when the scheme check passed.)
    **Retest on any maplibre-gl or Next bump**: if upstream fixes this, the vendored worker
    and the `setWorkerUrl` call can both go away.

## Listing map Phase 2 — shipped 2026-07-25 (pin picker), and what it leaves open

Phase 2 added `ListingMapPicker` (tap/drag pin, geolocation button, governorate-based
centring) to the add-listing wizard and the edit page, plus the free-text `address`
field. Remaining gaps:

- **PostGIS `location` column still isn't written, and now needs a BACKFILL.** There is
  no `ST_MakePoint` writer anywhere in `../forsa-backend/src` (verified: zero hits), so
  every listing created from now on has latitude/longitude with a NULL `location`. When
  proximity search ("listings near me") lands, changing the insert path is not enough —
  ads created between now and then would be silently invisible to radius queries. The
  writer must ship with:
  ```sql
  UPDATE listings SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;
  ```
- **"Hide map" is stored in JSONB, not a column — deliberately, and worth revisiting.**
  The seller's opt-out rides in `Listing.attributes._hideMap` (`HIDE_MAP_ATTR_KEY` in
  `lib/map.ts`), following the existing underscore convention for non-catalog internal
  keys (`_seed`/`_seedKey` from the backend seeder); the detail page's spec table already
  skips every `_`-prefixed key, so it never renders as a row. This needed ZERO backend
  change — create and update already accept `attributes`, and detail returns it.
  **The cleaner home is a real column** (`hideLocationMap Boolean @default(false)`), since
  this is a persisted seller choice affecting public rendering, not a category attribute
  (AGENTS §4 says attributes are catalog-driven). Migrating later costs one data step:
  ```sql
  -- after adding the column
  UPDATE listings SET hide_location_map = true
  WHERE attributes ->> '_hideMap' = 'true';
  ```
  plus changing `isLocationMapHidden()` and the one payload line in `CreateListingForm`.
  Also note the JSONB flag is vulnerable to any future edit path that replaces
  `attributes` wholesale — none does today (the edit page doesn't send attributes).
- **The edit page has no "hide map" toggle** — only the wizard sets it. Because the edit
  page never sends `attributes`, an existing flag survives edits untouched; a seller just
  can't change their mind there yet.
- **A pin can be moved but not erased.** `updateListingSchema` types latitude/longitude
  as `optional()` and not `nullable()`, so an omitted field means "leave unchanged" and
  there is no wire representation for "remove the pin". The edit page therefore passes
  `allowClear={false}` to the picker rather than showing a clear button that silently
  does nothing. Fix needs `.nullable()` on both fields backend-side plus a service that
  writes null; then drop that prop.
- **The wizard still has no `governorate` field.** «المحافظة» registers as `city`
  (`Step2AdDetails.tsx`), so the backend's `governorate` column stays null and Phase 1's
  address line shows city only. The picker's centring reads `city` for this reason.
  Part of the Phase 3 location cleanup — when it lands, revisit both.
- **«المنطقة» and «الحي» are free-text inputs; Phase 3 should make them dropdowns.**
  District and neighborhood are typed by hand today (`Step2AdDetails.tsx`), so the same
  place arrives spelled several ways — which blocks grouping, filtering by neighborhood,
  and any "listings in this area" view, and is why the address line can read oddly. Needs
  a structured district/neighborhood catalog per governorate on the backend (the same
  shape as the doushesh catalog: seeded, slug-keyed, served for the frontend to render),
  then cascading selects here: governorate → district → neighborhood. Do it together with
  the `city`/`governorate` fix above — both touch the same four fields, and migrating the
  existing free-text values is one pass rather than two.
- **Geolocation needs a secure context.** Works on `localhost` and `https://fursago.com`;
  silently unavailable over a LAN IP (`http://192.168.1.6:3000`), which is how a phone
  reaches the dev server. Test the GPS button on a deployed preview, not over LAN.
- **`/listings/edit/[id]` UI is Turkish** ("İlan Başlığı", "Fiyat", …) while the rest of
  the app is Arabic. Pre-existing; the new map section there is Arabic per §3.5. Worth a
  pass when that page is next touched.
- Still deferred from Phase 1: no map on browse/search, no geocoding (address ↔ coords),
  and self-hosted PMTiles as the provider escape hatch.

## Phase 3b — location cascade (shipped; these remain)

- **The listing READ payload does not expose `regionSlug`.** The write paths take one
  (`POST`/`PATCH /listings`), but no read path on the backend includes the `region`
  relation, so `GET /listings/:id` returns only the denormalized text. Consequence:
  `/listings/edit/[id]` cannot PREFILL the cascade with the listing's current place —
  it shows the stored location as text and opens an empty cascade only when the seller
  clicks «تغيير». Fix is one line backend-side (`region: { select: { slug: true } }` on
  the listing select); then the edit cascade can open pre-filled and this opt-in dance
  goes away. Until then, note the safety property it relies on: omitting `regionSlug`
  from a PATCH leaves `regionId`/`city`/`governorate`/`neighborhood` untouched.
  **The frontend half is now done** — `locationsService.resolveCascade` + the cascade's
  prefill effect rebuild the rendered ladder from a bare slug (R5), and the wizard's
  back-navigation already exercises that path. The moment the read payload carries
  `regionSlug`, the edit page can pass it straight through.
- **The wizard's `district` field is now written by nothing.** The cascade sets
  `regionSlug` + `city` + (for «أخرى») `neighborhood`; `district` stayed in the zod schema
  and `CreateListingPayload` because the browse filters still send a `district` query
  param and older listings still carry the column. Retire it with the `city`/`governorate`
  cleanup above, not before — verify the browse filter first (§2).
- ~~**Aleppo city neighborhoods hang under the جبل سمعان district.**~~ RESOLVED by Phase 4
  (R5): the backend's grouped discovery view surfaces them as «أحياء المدينة» on the
  governorate's own rung, so باب المقام is 2 steps from حلب. `getGovernorateShape` is gone
  — `getStep` + the backend's groups replaced it.
- **`SearchableCombobox` caps each GROUP at 60 rows** (`MAX_PER_GROUP`) and tells the
  seller to keep typing. The cap moved from per-list to per-group in R5 and that is
  load-bearing, not cosmetic: حلب's grouped rung is 128 «أحياء المدينة» + 8 «المناطق», and
  a flat cap spent its whole budget on the first group and dropped the second entirely —
  منبج, the only way into the rural half of the governorate, became invisible until the
  seller typed its name. A group can now be truncated but never erased. A real virtualiser
  still isn't worth pulling in for one control; the biggest rung is 184 rows (مركز حلب).
- **The hybrid threshold switches search STRATEGY, not whether the fetch happens.**
  `PLACE_FETCH_ALL_MAX = 150` decides client-filter vs server-search. `childCount` now
  rides on the payload (the backend added it in Phase 4), so a preventive variant that
  skips the download is finally possible — but the 4-level tree cut the largest rung from
  487 rows to 184, so there is nothing left worth preventing. Revisit only if a future
  reseed reintroduces a big flat list.
- **`دمشق` (the city itself, `placeType: 'city'`) sorts under «القرى والبلدات».** Scope
  narrowed in R5: the urban/rural split now applies ONLY to plain (backend-ungrouped)
  rungs, since the governorate rung takes its groups from the backend. Still reads oddly
  where it does apply; if it bothers anyone, either rename the lower group or special-case
  `level === 'PLACE' && placeType === 'city'` into the upper one.
- **Prefill lands on the SHORTEST ladder, which can differ from the path the seller
  originally clicked.** `resolveCascade` re-descends with the same loader interactive use
  runs and stops at the first rung that contains the target, so a Damascus neighborhood
  reached by hand as دمشق → المزة → الجلاء (3 controls) reopens as دمشق → الجلاء (2), since
  «أحياء المدينة» carries it directly. Same `regionSlug`, same map centre, fewer controls —
  deliberate, but worth knowing before someone files it as a prefill bug.

## `getMyListingsPaged` may share the `meta.total` bug — UNVERIFIED (logged 2026-08-13)

`getListings` was returning the PAGE SIZE as `total` (`data.length`) because the live
`/listings` envelope puts pagination in a `meta` sibling of `data`, not inside it — which
pinned `totalPages` to 1 and left the browse pager stuck on «صفحة 1 / 1» with «التالي»
disabled. Fixed for `/listings`.

`getMyListingsPaged` (`listings.service.ts`, the `/users/me/listings` → `/listings/me`
fallback pair) has the SAME array branch — `{ listings: data, total: data.length,
totalPages: 1 }` — and feeds the account-listings pager the same way. It is very likely
broken identically.

Deliberately NOT changed: that route is auth-gated and its envelope was never observed, so
applying the fix would be guessing at a shape (§2 — verify before acting on a label).

TO DO: call `/users/me/listings?page=1&limit=1` with a real session, look at where `total`
actually lives, and if it is a `meta` sibling apply the same `meta?.total ?? data.length`
treatment. Check `getMyListings` (unpaged) at the same time.

## Three copies of the listing-price formatter (logged 2026-08-13)

`formatListingPrice` now lives in `src/lib/money.ts` because the browse map's price
labels must read identically to the cards («$65,000», «19,900 ل.س») and a shared
function is the only thing that guarantees it.

`ListingCard.tsx` and `FeaturedSection.tsx` still each carry a local `formatPrice`
with the same output (FeaturedSection's rounds and pins `maximumFractionDigits: 0`,
so it is near-identical rather than identical). Deliberately left alone: swapping them
out touches shipped card rendering, which has nothing to do with the map work in
flight, and every one of them currently agrees.

TO DO: point both components at `formatListingPrice` and delete the local copies —
after confirming the FeaturedSection rounding difference is not load-bearing.

## ~~No by-ids listing endpoint~~ — RESOLVED 2026-08-13, with one field still missing

**Resolved:** the backend shipped `GET /listings/by-ids?ids=a,b,c` (live on
api.fursago.com and local dev). `listingsService.getListingsByIds` now makes ONE request
instead of N; verified live: a 6-listing cluster went from 6 requests / ~17KB of detail
payloads to 1 request / ~9KB of card payloads. Request order is honoured server-side,
unknown ids are omitted, and the server cap matches `MAX_LISTINGS_BY_ID = 30`.

**Still true, still load-bearing:** `GET /listings` **silently ignores** `?ids=` and
`?id=` and returns the whole unfiltered result set (verified live — asking for 2 ids
returned all 25, with a healthy `200`). The fix is the dedicated `/listings/by-ids`
path; anyone who "simplifies" it back onto the list endpoint ships a sheet showing the
wrong listings that looks fine doing it.

### ~~Open: the card payload has no `neighborhood` / `district`~~ — RESOLVED same day

Briefly true and no longer: the first `/listings/by-ids` build returned only
`city`/`governorate`, so every row of a centroid pile read «دمشق». The backend added
`neighborhood` + `district` to `LISTING_CARD_SELECT`. Re-verified live on the biggest
real cluster — 3 distinct location lines where there had been 1:

| row | renders |
| --- | ------- |
| شقة فاخرة بإطلالات في قدسيا | قدسيا، دمشق |
| شقة رائعة في منطقة التجارة | التجارة، دمشق |
| the other four (no neighborhood set) | دمشق |

**No frontend change was needed** — `locationLine()` already read those columns through
`formatAddressLine`. Worth recording because the diagnosis that reached us was that the
card payload carried the `region` RELATION (nameAr + parent chain) and the frontend was
reading the flat columns instead. It is the other way round: `LISTING_CARD_SELECT` has
the four flat columns and no `region`; `region` + the flattened `locationPath` are
`LISTING_DETAIL_INCLUDE` only. Reading the columns is correct on a card.

So `locationLine()` keeps both branches: `locationPath` when it has real depth (detail-
shaped data), else the columns. On card payloads the first branch simply never fires.
The remaining bare «دمشق» rows are test listings with no neighborhood in the DB — the
data is genuinely absent, not dropped in transit.

## Catalog endpoint's `stale-while-revalidate=86400` is too long (logged 2026-08-15)

The backend sends `Cache-Control: public, max-age=300, stale-while-revalidate=86400` on
every `/catalog/*` response. The 24h stale window is what hid a live reseed from the
homepage sidebar: after `caravans` + `marine-vehicles` landed under `vehicles` (14
children live on api.fursago.com), the founder's browser kept serving the previous
12-child copy and refreshing it only in the background — so the new rows, and the
«عرض المزيد» fold that appears once anything follows the `damaged-vehicles` cut point,
showed up a page load late. A hard refresh did not help: Chrome's reload bypass covers
the navigation and its subresources, NOT `fetch()` calls a script makes after load.

**Fixed client-side** (commit `fix(catalog): revalidate catalog fetches`): the three
catalog GETs in `catalog.service.ts` pass `cache: 'no-cache'`, so the browser always
revalidates. Cheap — the responses carry an ETag and the API answers conditional
requests with a headers-only 304, CORS headers included (verified against
api.fursago.com). The module-level promise cache still collapses a page load to one
request per key, which is what protects the shared rate-limit bucket; the HTTP cache
never was that guard.

TO DO (backend/infra, not urgent): reconsider the policy at the source. A catalog that
changes rarely but must reflect a reseed PROMPTLY wants a short `max-age` with `must-
revalidate`, or a `stale-while-revalidate` measured in minutes — not a day. Today every
client that is not this service (and anything sitting between us and the origin) can
still serve a 24h-old tree. Worth pairing with cache-busting on reseed if the backend
ever fronts these responses with a CDN — `cf-cache-status` is currently `DYNAMIC`, so
Cloudflare is not holding a copy, and that is the only reason a client-side fix was
sufficient here.

## 12 account pages still carry the hand-rolled `mounted` auth gate (logged 2026-08-16)

`hooks/use-auth-gate.ts` now exists precisely because the per-page pattern it replaces
failed twice. The auth store persists to localStorage, so `isAuthenticated` is false
until zustand rehydrates; a page that redirects on that first false throws a logged-IN
user to /login on every hard refresh (client-side nav hides it — the store is already
in memory by then). Fixed once on saved-searches (65aa2a0) with a copy-pasted `mounted`
flag, and it recurred on five more pages (f3a371f), including two the founder had not
yet reported.

Those five now use the hook. TWELVE pages still hold their own `useState(false)` +
mount effect, each re-implementing the same three-line gate:

  account, listings, listings/inactive, messages, messages/[id], offers/buyer,
  offers/seller, questions, saved-searches, store, secure-payment/buying,
  secure-payment/selling

They all WORK — this is not a bug list. It is the copy-paste surface that produced the
bug twice, and the reason a third recurrence is a matter of when, not whether: the next
account page someone adds will be copied from one of these twelve, gate and all, or
from one that forgot it.

TO DO: migrate all twelve to `useAuthGate(<own path>)`, deleting the local `mounted`
state, and keep the redirect target each page already uses (several redirect to a bare
/login and would gain a ?redirect= back to themselves — check that against the login
form's safeRedirect handling before assuming it is an improvement). Mechanical, but it
touches twelve shipped pages, so it wants its own commit and its own browser pass — not
something to fold into a launch-blocker fix.

NOT the answer: hoisting the guard into `account/layout.tsx`. It is a server component,
and converting it would change rendering for all seventeen account pages at once. If
that is ever wanted it is a deliberate architecture change, not a cleanup.

## ComparePopover still formats money the Turkish way (logged 2026-08-16)

`ComparePopover.tsx`'s local `formatPrice` (top of file) uses `Intl.NumberFormat('tr-TR')`
and prints `SYP`, and its `infoLine` prints `KM` — a leftover from the Turkish reference
build. The panel sitting right beside it, `RecommendationsPopover.tsx`, has an
almost-identical helper that uses `en-US` and prints `ل.س` and `كم`. Same two rows of
data, two different renderings, in an Arabic-first UI.

Invisible until now, which is why it survived: the compare panel was clipped away by an
ancestor's overflow and never appeared on screen (fixed in 58501c4). It is visible from
this commit onward.

TO DO: point it at `formatListingPrice` from `lib/money.ts` — the shared formatter that
already guarantees the browse map's price labels read identically to the cards — and
delete the local copy, translating `KM` to `كم` at the same time. Pairs naturally with
the existing entry above about the three copies of the listing-price formatter
(ListingCard, FeaturedSection): this is a fourth, and the same one-formatter fix closes
all of them. Deliberately not folded into 58501c4, which was scoped to making the
buttons work.

## Catalog attribute filters are collected but never sent to the API (logged 2026-08-16)

`CatalogFilterView` (FilterSidebar) writes every catalog-driven filter value into
`FilterValues.attributes` via `setAttr`. Nothing ever reads it: `attributes` appears in
neither `lib/listing-query.ts` nor `buildListingSearchParams` (listings.service), and
neither browse page forwards it. `GetListingsParams` has no `attributes` field. So the
values are collected in the UI, shown as active, and silently dropped.

Every non-vehicle root is affected, because catalog filters are the ONLY filters those
roots have. The seller-type work is where it surfaced — the catalog already defines
exactly the right per-category options, and none of them filter anything:

  real-estate / apartment-for-sale   fromWho «الناشر»       شركة بناء | مكتب عقاري | المالك
  services                           providerType «مقدم الخدمة»  فردي | شركة أو مؤسسة
  private-lessons                    tutorGender | mode | groupType
  cars                               seller «المعلن»        المالك | وسيط

So the founder's requirement "real-estate should offer من مكتب عقاري" is already seeded
backend-side and cannot work until this is wired. The same is true of `classicSeller`
and `fromWhosRealEstate` in the bespoke vehicle sidebar — also never serialized.

Probed against the live API: `attributes=`, `attrs=`, `attr_fromWho=` and a bare
`rooms=` all return the full unfiltered set (unknown params are ignored, not rejected),
so there is no attribute-filtering support to point at yet — CONFIRM in
`../forsa-backend` rather than trusting that probe.

TO DO, in this order (cross-repo rule — backend lands first):
  1. backend: accept catalog attributes on GET /listings and filter the JSONB on them.
  2. frontend: serialize `FilterValues.attributes` in `buildListingSearchParams`, using
     whatever shape the backend settles on. Values are OPAQUE (§4.3) — pass SELECT
     options through verbatim, never parse or coerce them.
  3. then revisit the seller-type UI: once real-estate's «من مكتب عقاري» actually
     filters, the car seller-tabs can stay vehicles-only for good.

## قارن + المفضلة moved to the mobile top bar only — desktop still uses the strip (logged 2026-08-17)

This round moved the two "things I've set aside" controls out of the white quick-links
sub-header and into the top bar's physical-left corner (founder's ask): on
`/category/[...slug]` via the shared blue `MobileTopBar`'s `actions` slot, on `/listings`
via a page-local blue toolbar (that route is a BottomNav root, so `shouldShowMobileTopBar`
returns false and the shared bar never renders there — and its Header row carries the only
search field on the page, so it could not be traded away for the bar). Both quick-links
strips became `hidden md:block`, because below md they held exactly those two items and
would otherwise have been an empty white band.

WHAT IS NOT DONE: **`MobileTopBar` is `md:hidden`, so there is no blue bar on desktop at
all.** At md+ قارن and المفضلة therefore still live in the quick-links strip, exactly as
before. They are never duplicated — no viewport width shows both placements — but the
founder's new placement is a phone-only change.

TO DO if the founder later wants the same relocation on desktop: that needs a separate
desktop home, not a tweak here. The desktop pages have no persistent app-chrome bar to put
them in (the Header is global chrome and must not take page-specific controls), so the
options are a desktop bar of their own or leaving the strip as the desktop answer. Decide
the destination first; `BrowseBarActions` is already the shared pair and can be restyled
for whatever it lands in.

## Stored attribute values that no filter can match (logged 2026-08-18)

Attribute filtering now works end-to-end (backend 24c9d30 + the frontend serializer in
`lib/attr-params.ts`), and turning it on exposed a DATA gap it cannot fix: some listings
hold SELECT values that are no longer in their category's option list, so picking that
option in the sidebar can never return them. Measured against the live dev DB with the
same resolver the browse whitelist uses (`../forsa-backend/scripts/_attrStaleValues.ts`,
untracked): **20 stale values — 15 on SEEDTEST rows, 5 on REAL listings.**

The real five are the ones that matter, and they are NOT a test-data cleanup item —
`seedCatalogTestListings.ts --cleanup` will not touch them:

    [ACTIVE] apartment-for-sale  rooms = "4"   (×3)
    [ACTIVE] apartment-for-sale  rooms = "6+"
    [SOLD]   apartment-for-sale  rooms = "3"

They predate commit 9917f9a, which moved real-estate room counts to X+Y notation
(«3+1», «2+1»). The catalog now serves only X+Y, so four ACTIVE apartments are invisible
to the «عدد الغرف» filter — the listings show fine, they just cannot be filtered to.

TO DO (backend, data — cross-repo rule: it lands there, not here): a small guarded
migration mapping the old notation onto the new option values, deciding what a bare "4"
means in X+Y terms (4+1? 4+0?) — that is a product call, not a mechanical one, which is
why this is logged rather than guessed at. The 15 SEEDTEST ones (12 of them `heating`,
values like «سبليت» / «مدفأة» that the current list dropped) go away with the pre-launch
cleanup and need nothing.

Also confirmed while measuring: **`services` / `providerType` has zero listings carrying
it** (0 rows), so the «مقدم الخدمة» filter is untestable end-to-end until the seeder
grows a services fixture. It is wired and will work — it has simply never been exercised
against data.

---

## ~~RecommendationsPopover's footer links point at two routes that don't exist~~ — MOSTLY RESOLVED 2026-08-18, one half remains

Found while wiring the mobile homepage's «إعلانات مخصصة لك» section (which reuses the
popover's `recommendationsService.getSuggested()`). The popover's "عرض الكل" footer linked
to `/account/onerilen` (suggested tab) and `/account/gecmis` (recent tab). Neither route
existed: `src/app/account/` has no `onerilen` or `gecmis` directory, and `next.config.ts`
declares no rewrites, so both were plain 404s. The names were also leftover Turkish,
unlike every other Arabic-facing route.

RESOLVED for the suggested half: `/recommendations` now exists (`app/recommendations/
page.tsx`) and both the popover's suggested tab and the mobile homepage section's
«عرض الكل» point at it. It asks for `limit=20` — the backend grew that query param the
same day (`suggestedQuerySchema`, default 3 / max 20), so the popover and the homepage
section keep their 3 by simply not passing one.

STILL OPEN — the recent tab. Its «عرض الكل» is now hidden rather than pointed somewhere
wrong, because there is no "recently viewed" page to send it to. That costs nothing
today: `getRecent` has a hard `take: 3` and no limit param, so the three rows in the
popover ARE the entire history the backend will serve. Building the page therefore needs
the BACKEND first (a limit param on `/recommendations/recent`, mirroring the suggested
one — cross-repo rule: it lands there, not here), and only then is a page worth having.
Until that happens the hidden link is the honest state, not a regression.
