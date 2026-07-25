<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Forsa Frontend Working Rules

Forsa: Syrian classifieds marketplace (sahibinden/doushesh-style), Arabic-first RTL UI. This repo is the **Next.js 16 web frontend**; the API + live Supabase dev DB live in `../forsa-backend` (separate repo, **its own CLAUDE.md — read it before touching anything DB-side**). Solo founder ("the human") + Claude as the dev team. Not launched yet — but the backend DB is shared live state: treat it as production.

Read this whole file before acting. When this file contradicts the codebase, the codebase wins — then fix this file in the same commit. The Next.js warning above is tool-maintained — leave the marker block intact.

---

## 1. Workflow discipline (the frontend half of the staged rollout)

The backend runs structural changes as numbered stages (R0 backup → author + dry-run → **human review stop** → guarded deletes → seed/apply → live verify → test data → browser verify → commit). The frontend obeys the same gates:

1. **Diagnosis-first when asked to investigate:** if the request says "investigate / confirm / read-only", produce the diagnosis and STOP. No fixes until the human approves. (Established pattern; don't be helpful past the stop.)
2. **Never claim done without proof:** `npx tsc --noEmit` AND `npm run build` green, plus — for anything with runtime surface — exercise it against the live dev API (curl the backend, drive the page).
3. **Commit only after the human verifies in the browser.** Finished work legitimately sits uncommitted in the working tree for days waiting on a backend seed + browser check. That's normal; don't "tidy up" by committing early.
4. **Cross-repo ordering:** backend schema/seed lands FIRST, then the frontend change is verified against it, then commit. A frontend feature that depends on unseeded catalog data isn't done — it's blocked.
5. **Before touching the DB in any way (seeds, deletes, SQL): switch to `../forsa-backend/CLAUDE.md` rules.** Never seed/apply before the human reviews a dry-run. Backups (R0) before structural changes; additive SQL first, destructive last; seeds are idempotent upserts-by-slug; deletes only via guarded scripts that print their targets and abort on unexpected live data. Never run seeds foreground/piped (they hang on the pooler and look "done") — background + file output + read the final `Bitti:` line.

## 2. Verify-before-delete (a real near-miss lives behind this rule)

**Never accept "orphan / dead / unused / redundant" labels at face value — including your own from five minutes ago.** Before deleting/removing anything (components, routes, exports, CSS, deps, DB rows): verify references yourself (grep imports/usages, check live listings/status via the API). When in doubt, keep — deprecate/rename instead. Adding back later is cheap; recovering deleted breadth is not.
- WHY: a backend category wipe once nearly took live listings with it; only a guard that aborted on unexpected ACTIVE rows stopped it.

## 3. Architecture map (where things go)

1. **API layer:** all HTTP goes through `src/services/api.ts` (`NEXT_PUBLIC_API_URL` — backend is `http://localhost:3001/api/v1` per `.env.local`, NOT 3000; 3000 is this dev server). Feature calls live in `src/services/*.service.ts`, never inline `fetch`.
2. **Envelope rule:** the REST API returns `{ success, data }` (the `api` wrapper unwraps); the **catalog endpoints return RAW arrays** — no envelope. Don't "fix" either side.
3. **State:** Zustand. Auth is per-portal **realms** (auth.store.ts factory): consumer session under `forsa-auth`, staff portals under `forsa-{admin,agent,accounting}-auth` — isolated stores, per-realm cross-tab sync and refresh single-flight. `api.ts` resolves a request's realm as explicit `realm` option > portal pathname prefix > user; consumer features that mount on portal pathnames (notifications, messages, recommendations, push) pin `realm: 'user'`. Server components by default; `'use client'` only where hooks/interactivity demand it.
4. **Styling:** Tailwind v4, `cn()` from `src/lib/utils.ts`, lucide-react icons. Brand: blue-600 primary, orange-500 secondary/CTA.
5. **RTL:** UI text is Arabic; always use logical properties/utilities (`ms-`/`ps-`/`start-`/`end-`), never `ml-`/`left-` for direction-sensitive layout.
6. **Printable / deep-linkable detail views are ROUTES, not modals** (human's standing preference).
7. Deliberate deferrals go in `FOLLOWUPS.md` with the why — tracked, not dropped.

## 4. Catalog-driven UI (the load-bearing convention)

The doushesh catalog (tree + inherited filters, served by the backend) drives browse and add-listing. The frontend's job is to RENDER what the catalog defines, not re-encode it.

1. **The split is by root slug:** `catalogRoot === VEHICLES_ROOT_SLUG` (`'vehicles'`, exported from `catalog.service.ts`) → bespoke hand-built UI (vehicle FilterSidebar facets, seller tabs من معرض). **Every other root** → generic catalog-driven UI (`CatalogFilterView` in browse, dynamic filter fields in `Step0Catalog`). New categories must appear with ZERO frontend changes once the backend seeds them.
2. **Never add hardcoded per-category UI** (tabs, facets, labels) outside the vehicles tree — that's how car-dealer seller tabs leaked onto private-lessons pages.
3. **Widget type decides rendering, not the value's shape:** SELECT options are opaque strings (may look numeric like `'126-250'`, may be Arabic text) — never parse/coerce them.
4. **RANGE means min–max in BROWSE, a SINGLE value in ADD-LISTING** (area = 120, not 100–150). The wizard's `BROWSE_ONLY_FILTER_KEYS` (`price`, `adDate`, `hasVideo`) and `LOCATION` widgets are deliberately excluded from Step 0 — price is entered once in ad details.
5. **Filters are inheritance-based on the backend** (defined once at the right altitude, deepest wins) — so a leaf's `getFilters` is the complete merged set; render it as-is, never merge or dedupe client-side.
6. Detect category context from the resolved catalog path (`getPath` → root slug), not `pathname.includes(...)`, in new code. The legacy pathname checks in FilterSidebar are vehicle-only and grandfathered.
7. **Syria-appropriateness** (content decisions surface in frontend picks too): don't add what doesn't exist in Syria's market; budget brands matter more than flagships; when in doubt, leave it out — adding later is cheap.
8. Slugs are globally unique English kebab-case; filter keys camelCase. They are API contracts — never invent or transform them client-side.

## 5. Commit discipline

1. **One logical unit per commit.** Message style matches the log: `feat:` / `fix:` / `style:` / `refactor:` (+ optional scope), terse subject, body says WHAT and WHY.
2. **Stage by explicit path** (`git add <file>`), never `-A`/`-u` — the tree carries local-only files by design.
3. **NEVER commit:** `.claude/settings.local.json`, `.env*`, test-data seeders or their `.ids/.creds.json`, `_backup_*`/`_stage_*`/one-off verify scripts, scratch HTML/screenshots, local provider hacks (the backend keeps a modified `resend.provider.ts` uncommitted on purpose). If it exists to verify one change, it doesn't ship.
4. Push right after committing; confirm the `old..new main -> main` line.

## 6. Test-data conventions

- Backend test listings carry `attributes._seed = 'SEEDTEST:…'` markers with one-command cleanup (`scripts/seedCatalogTestListings.ts --cleanup` in the backend). When you verify frontend features against seeded data, that's what you're looking at — **never treat SEEDTEST rows as real content**, and never create test data outside that seeder.
- Test data never ships to launch; cleanup is a pre-launch checklist item. Don't run `--cleanup` mid-verification (it wipes ALL markers, not just yours).

## 7. Environment gotchas (Windows 11 + PowerShell 5.1)

1. PowerShell prints `RemoteException` for git push's normal stderr — **harmless**; read the actual push result line.
2. PS 5.1: no `&&` / `||`; commit messages via here-strings `@'…'@` with the closing quote at column 0; pass `-Encoding utf8` when writing files other tools read.
3. Backend-side (when you cross over): **stop the dev server before `prisma generate`** (Windows EPERM file lock); **use the Supabase session port 5432 for `migrate diff`/introspection** — the app's pooler port 6543 lies about drift.
4. `npm run build` warns about multiple lockfiles (a stray `C:\Users\ASUS\package-lock.json`) — known, harmless.
5. Console `curl` output mangles Arabic — decode API responses with a UTF-8-explicit python script, not by eyeballing terminal bytes.
6. **`npm run build` while the dev server runs freezes dev CSS** (they share `.next`) — stop dev first, build, then delete `.next` and restart dev before any browser verify.

## 8. Common mistakes (each one really happened or nearly did)

1. **Trusting a label ("unused", "orphan", "duplicate") without grepping references / querying live status** — the near-miss. Verify, then act. (§2)
2. **Blaming the frontend for missing filters/options before checking the live catalog API** — `GET /catalog/categories/:slug/filters` first; "renders nothing" is usually "backend hasn't seeded it yet", not a rendering bug.
3. **Hardcoding category-specific UI instead of letting the catalog drive it** — the seller-tabs leak. (§4.1–2)
4. **Min–max inputs in the add-listing wizard** (or single values in browse) — RANGE semantics differ by surface. (§4.4)
5. **Committing before the human's browser verification, or "fixing" past a read-only diagnosis request** — the stops ARE the discipline. (§1)
6. **Committing test artifacts / local settings** — explicit paths only. (§5.3)
7. **Running backend seeds unwatched/piped on the pooler** and assuming completion. (§1.5)
8. **Pointing at the wrong port** — backend is 3001 here (`.env.local`), dev server is 3000; memory/docs claiming a 3000 backend are stale.
9. **Writing training-data Next.js** — check `node_modules/next/dist/docs/` first (see the block at the top).
10. **Re-deriving state from memory instead of the repo** — memory is point-in-time; re-verify counts, ports, and file:line claims against current code before acting on them.
11. **Positioning a vendor-controlled container with a Tailwind utility** — third-party CSS (maplibre, and any future date picker / lightbox / chart lib) ships **UNLAYERED**, while Tailwind v4 emits utilities inside `@layer utilities`. Unlayered CSS beats layered CSS *regardless of specificity or source order*, so the library's own rules silently win. Never rely on `absolute`/`inset-0`/etc. for the element you hand to a library — size it with **inline styles** or with properties the library doesn't set.
    - WHY: the listing map rendered a blank box for hours. `maplibre-gl.css` declares `.maplibregl-map{position:relative}` and maplibre adds that class to the container it is given — overriding our `absolute inset-0`, so `inset` stretched nothing, height fell to `auto`→0 (the canvas container inside is absolutely positioned), and the canvas rendered at 0×0. Style, worker and tiles were all healthy the whole time, which sent the diagnosis chasing network/worker/event ghosts. See the comment in `ListingMap.tsx`.
