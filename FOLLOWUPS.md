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
- **The wizard's `district` field is now written by nothing.** The cascade sets
  `regionSlug` + `city` + (for «أخرى») `neighborhood`; `district` stayed in the zod schema
  and `CreateListingPayload` because the browse filters still send a `district` query
  param and older listings still carry the column. Retire it with the `city`/`governorate`
  cleanup above, not before — verify the browse filter first (§2).
- **Aleppo city neighborhoods hang under the جبل سمعان district, not the governorate.**
  So an Aleppo *city* seller has to pick a district whose name is a rural-sounding
  administrative unit before their حي appears. The governorate-scoped search box covers
  it (typing the neighborhood name finds it regardless of district), but if 3a-2 is ever
  re-seeded, attaching city neighborhoods directly to the GOVERNORATE would let
  `getGovernorateShape` return `mode: 'places'` for Aleppo too — the code already handles
  that branch, it just has no data taking it today.
- **`SearchableCombobox` caps the rendered list at 60 rows** (`MAX_RENDERED`) and tells
  the seller to keep typing. al-Hasakah's largest district holds 487 places, and a real
  virtualiser was not worth pulling in for one control. Revisit if the combobox gets
  reused somewhere the tail matters more.
- **The hybrid threshold switches search STRATEGY, not whether the fetch happens.**
  `PLACE_FETCH_ALL_MAX = 150` decides client-filter vs server-search, but the catalog API
  exposes `hasChildren` (boolean) and no CHILD COUNT, so a list's size is only knowable
  after it has been downloaded — al-Hasakah's 487 places are fetched once (cached for the
  session) even though typing then goes to the server. Adding `childCount: r._count.children`
  to `shape()` in the backend's `locations.controller.ts` would make the threshold
  preventive and let large districts skip the download entirely. One line, backend-side.
- **`دمشق` (the city itself, `placeType: 'city'`) sorts under «القرى والبلدات».** The
  group split is `neighbourhood`/`quarter`/`suburb`/`borough` → «الأحياء», everything else
  → «القرى والبلدات», which follows the agreed labels literally but reads oddly for the
  one row that is a city inside its own governorate. Harmless today (it is 1 of 113 in
  Damascus); if it bothers anyone, either rename the lower group or special-case
  `level === 'PLACE' && placeType === 'city'` into the upper one.
