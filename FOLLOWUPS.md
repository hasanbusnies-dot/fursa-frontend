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
