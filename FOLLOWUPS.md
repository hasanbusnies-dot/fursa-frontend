# Follow-ups (tracked, not dropped)

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

## 3. Full BroadcastChannel cross-tab single-flight refresh — MEDIUM
**Current state:** `auth.store.ts` has a lightweight `storage`-event listener so sibling
tabs *adopt* the newest tokens after a refresh (and mirror logout). This prevents most
tab-vs-tab token fights, but two tabs can still *initiate* a refresh at nearly the same
moment (each tab has its own in-memory single-flight promise).

**Fix:** elect a single "refresher" across tabs via `BroadcastChannel` (or a Web Lock):
only the leader calls `/auth/refresh`; it broadcasts the new tokens; followers await the
broadcast instead of calling the endpoint. Eliminates the residual cross-tab rotation race
entirely.

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

## 5. Maskable PWA icon (Android adaptive icon) — LOW, pre-TWA
**Where:** `src/app/manifest.ts` — icons are `purpose: any` only.

**Problem:** Android adaptive icons crop to a central safe zone (~80% circle). The current
`public/forsa-logo-*.png` artwork (wordmark spanning the full width) would get its edges
clipped in a circular mask, so no `purpose: maskable` entry was declared — launchers fall
back to shrinking the `any` icon inside a plain background, which is safe but less polished.

**Fix:** export a dedicated maskable asset (mark centered inside the safe zone with padded
solid background, e.g. `forsa-logo-maskable-512.png`) and add it to the manifest with
`purpose: 'maskable'`. Do this before the TWA (mobile roadmap Phase 1) ships.

Deferred during the logo integration (2026-07-09) because it needs a new asset from the
logo source files, not code.

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
