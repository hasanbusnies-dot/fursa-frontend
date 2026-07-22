# Follow-ups (tracked, not dropped)

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
