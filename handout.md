# Handout — running work log

A record of what was touched, why, and how it was verified. Newest task at the bottom.
Plan being executed: `docs/superpowers/plans/2026-08-03-phase1a-foundation-api.md` (Phase 1A, 15 tasks).

---

## Task 11 — Leads — 2026-08-04 — DONE (commit `2e0ed52`)

**Where the previous session stopped:** `LeadsModule` was imported in `app.module.ts`
but never added to the `imports` array, so every `/api/leads` route 404'd. The plan's
Step 6 (e2e test) had not been written.

### Files

| File | Change |
| --- | --- |
| `apps/api/test/leads.e2e-spec.ts` | **new** — 12 e2e tests: public submission, phone normalisation, public response shape, 400 on bad phone, 429 rate cap, 401 on unauthenticated list/update, ordering, pagination, update, 400 on bad status, 404 on unknown id |
| `apps/api/src/app.module.ts` | registered `LeadsModule` in the `imports` array |
| `apps/api/src/leads/leads.service.ts` | `create` now uses Prisma `omit: { internalNotes: true }`; `update` maps Prisma `P2025` to `NotFoundException` |

Written in the previous session, unchanged here: `packages/types/src/lead.ts`,
`packages/types/src/lead.test.ts`, `apps/api/src/leads/leads.controller.ts`,
`apps/api/src/leads/leads.module.ts`, `packages/types/src/index.ts`.

### Bugs the tests caught

1. **`internalNotes` leaked to the public.** `POST /api/leads` echoed the whole row back
   to the anonymous submitter, including the internal sales-notes field. Fixed with a
   Prisma-level `omit` so the column never leaves the data layer.
2. **500 instead of 404.** `PATCH /api/leads/:id` with an unknown id threw an unhandled
   `P2025` and surfaced as a 500. Now a `NotFoundException`, matching `MediaService.remove`.

### Gotcha worth remembering

The public `POST` is capped at 5/hour/IP and the throttler store is shared across the
whole e2e file (`resetDb` truncates tables, not throttler state). The POST tests stay
inside that budget and the cap assertion runs last — adding a POST test earlier in the
file can push a later one into a 429.

### Verification

- `pnpm test:e2e` (apps/api) — 19 passed, 2 suites
- `pnpm test` (root) — 25 passed (api), 21 passed (types)
- `pnpm typecheck` — clean
- `pnpm lint` — no lint task defined in any package, nothing ran

### Deliberately skipped

The plan's file list mentions `apps/api/src/leads/leads.service.spec.ts`, but no step
describes it. `LeadsService` is a thin Prisma wrapper; a mock-Prisma unit spec would
assert on the mock, and every behavior is already covered against real Postgres in the
e2e. Add it only if a unit-level regression net is wanted.

---

## Task 12 — Services, working areas, projects — 2026-08-04 — DONE

Plan section: Task 12, "Content resources". Executed test-first throughout.

### Files

| File | Change |
| --- | --- |
| `apps/api/src/common/slug.spec.ts` | **new** — 7 tests (5 `slugify`, 2 `uniqueSlug`), taken from the plan verbatim |
| `apps/api/src/common/slug.ts` | **new** — `slugify` (NFKD → strip combining marks → lowercase → hyphenate, `"item"` fallback for Bangla-only titles) and `uniqueSlug` (appends `-2`, `-3`, … until free) |
| `packages/types/src/content.ts` | **new** — `create/update` schemas for Service, WorkingArea, Project, built from `bilingualText`, plus `projectFilterSchema` for `?workingArea=` |
| `packages/types/src/index.ts` | export `./content.js` |
| `apps/api/src/content/services.service.spec.ts` | **new** — 3 tests: `listPublic` hides drafts, `listAll` shows them, `findPublicBySlug` returns null for a draft |
| `apps/api/src/content/content.helpers.ts` | **new** — `connectGallery` / `setGallery` (Media join-table writes) and `notFoundIfMissing` (Prisma `P2025` → 404), shared by all three services |
| `apps/api/src/content/services.service.ts` | **new** — `listPublic` / `listAll` / `findPublicBySlug` / `create` / `update` / `remove` |
| `apps/api/src/content/working-areas.service.ts` | **new** — same shape; no `published` column exists, so `listAll` delegates to `listPublic` |
| `apps/api/src/content/projects.service.ts` | **new** — same shape; public list filters by working-area slug, featured rows sort first |
| `apps/api/src/content/{services,working-areas,projects}.controller.ts` | **new** — public `GET /` and `GET /:slug`; `POST`/`PATCH` need ADMIN or EDITOR, `DELETE` needs ADMIN |
| `apps/api/src/content/content.module.ts` | **new** — wires the three controller/service pairs, imports `AuthModule` for the guards |
| `apps/api/src/app.module.ts` | registered `ContentModule` |
| `apps/api/test/content.e2e-spec.ts` | **new** — 22 e2e tests (see below) |

### Decisions worth knowing

- **`listAll` is not exposed over HTTP.** The plan only specifies public list, public
  detail, and authenticated writes. The draft-inclusive listing exists as a service
  method (unit-tested) and gets a route when the admin UI needs one in Plan 1B/1C —
  that keeps `GET /api/services` unambiguously public-and-published-only, which is
  what the Task 15 contract test asserts.
- **Slugs are generated on create only**, from the English title/name. They are not
  regenerated when a title changes, because published URLs must stay stable.
- **Role split follows the media module**: create/update for ADMIN + EDITOR, delete for
  ADMIN only.
- **Drafts 404 rather than 403** on the public detail route, so the endpoint does not
  confirm that an unpublished slug exists.

### Beyond the plan

The plan's Task 12 has no e2e step — content routes would otherwise stay unverified
until Task 15, which runs against seeded data. Given Task 11 stopped with an
unregistered module and every route silently 404ing, `content.e2e-spec.ts` was written
*before* registering `ContentModule` (19 of 22 failed, as expected) so the wiring itself
is covered. It also pins the role split, slug suffixing, draft hiding, and the
`?workingArea=` filter.

### Verification

- `pnpm test:e2e` (apps/api) — 41 passed, 3 suites (auth, leads, content)
- `pnpm test` (root) — 35 passed (api), 21 passed (types)
- `pnpm typecheck` — clean

### Note for next time

`@homeinn/types` resolves from `dist/`, so after editing anything in `packages/types`
run `pnpm --filter @homeinn/types build` or the API's jest run fails with
"has no exported member".
