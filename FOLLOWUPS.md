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

---
_Owner: messaging/auth refactor. Raised during the Socket.io migration groundwork._
