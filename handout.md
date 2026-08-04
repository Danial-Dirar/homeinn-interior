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

---

## Task 13 — Clients, hero, blog, testimonials, team, certifications, settings — 2026-08-04 — DONE

Plan section: Task 13. Seven resources; the two with real logic were written test-first
against the plan's own specs, the rest are CRUD covered by e2e.

### Files

| File | Change |
| --- | --- |
| `apps/api/src/content/clients.service.spec.ts` | **new** — 4 tests, the privacy suite from the plan |
| `apps/api/src/content/clients.service.ts` | **new** — `listCorporatePublic`, `residentialSummary` (count + districts, `select: { address: true }` so names are never loaded), `listResidentialPublic` (consented rows only) |
| `apps/api/src/content/hero.service.spec.ts` | **new** — 3 tests: desktop returns all active, mobile narrows to `showOnMobile`, inactive never returned |
| `apps/api/src/content/hero.service.ts` | **new** — `listActive(target)`, `listAll`, CRUD |
| `apps/api/src/content/blog.service.spec.ts` | **new** — 6 tests incl. future-dated posts staying hidden and `publishedAt` stamping |
| `apps/api/src/content/blog.service.ts` | **new** — public list requires `published && publishedAt <= now`; create/update stamp `publishedAt` when a post goes live without a date |
| `apps/api/src/content/{testimonials,team,certifications}.service.ts` | **new** — `listPublic` / `listAll` / CRUD; certifications have no `published` column so both lists agree |
| `apps/api/src/content/{clients,hero,blog,testimonials,team,certifications}.controller.ts` | **new** — public reads, writes behind ADMIN/EDITOR, deletes ADMIN-only |
| `apps/api/src/content/content.module.ts` | now wires all nine content services/controllers |
| `apps/api/src/settings/settings.{service,controller,module}.ts` | **new** — singleton row; both read and write upsert so a fresh database never 404s |
| `packages/types/src/content.ts` | added blog, testimonial, team, certification and hero-segment schemas + `heroQuerySchema` |
| `packages/types/src/settings.ts` | **new** — `updateSettingsSchema` (fully partial; one row, only ever edited) |
| `packages/types/src/index.ts` | export `./settings.js` |
| `apps/api/src/app.module.ts` | registered `SettingsModule` |
| `apps/api/test/site-content.e2e-spec.ts` | **new** — 21 e2e tests across all seven resources |

### Decisions worth knowing

- **Clients are read-only over HTTP.** Both lists come from the company profile and are
  owned by the seed, so there is no admin CRUD and — deliberately — no route that can
  return a non-consenting residential row. The e2e asserts the private name never
  appears on any of the three client routes.
- **`GET /api/settings` upserts.** A fresh database would otherwise 404 on a route the
  footer always calls. The placeholder row uses empty strings for contact details
  (nothing invented) and `establishedYear: 2015`, which is spec-backed; Task 14's seed
  replaces it.
- **Settings writes are ADMIN-only** — an editor changing the company phone number is a
  different class of change from editing a blog post.
- **Blog publishing stamps a date.** `listPublic` filters on `publishedAt`, so a post
  published without one would have been invisible; create/update fill it in.

### Verification

- `pnpm test:e2e` (apps/api) — 62 passed, 4 suites
- `pnpm test` (root) — 48 passed (api), 21 passed (types)
- `pnpm typecheck` — clean

---

## Task 14 — Seed the real business data — 2026-08-04 — PARTIAL (blocked on source)

Plan section: Task 14. Everything the sources support is seeded and verified. The two
client tables are blocked — details below.

### Files

| File | Change |
| --- | --- |
| `apps/api/prisma/seed-data/working-areas.ts` | **new** — the 9 areas from spec §2, English verbatim, Bangla translated, slugs written out |
| `apps/api/prisma/seed-data/services.ts` | **new** — the 7 services from spec §2, English verbatim, Bangla translated |
| `apps/api/prisma/seed-data/corporate-clients.ts` | **new** — typed shape + empty array; header records what the transcription must contain |
| `apps/api/prisma/seed-data/residential-clients.ts` | **new** — same, plus the rules for serials 17/33 and `publiclyListed` |
| `apps/api/prisma/seed.ts` | **new** — exports `seed(prisma)`; upserts settings, working areas, services, client rows, 3 certifications and one ADMIN user |
| `apps/api/test/seed.e2e-spec.ts` | **new** — 10 passing assertions + 3 `it.todo` for the blocked rows |

### BLOCKED — the client tables need the company profile PDF

`corporate-clients.ts` and `residential-clients.ts` are empty arrays, not oversights.

The plan says to transcribe 73 corporate and 57 residential rows "from spec §2's
source tables", but **spec §2 contains no such tables** — it records only the counts,
the 13-district list, and the 8 flagship names. The profile PDF itself is not in this
repository (no PDF anywhere in the tree, nothing in git history).

Inventing the rows would fabricate company names, private individuals' names, and
their home addresses — exactly what spec §12 forbids. So the shapes and the seeding
loop are written and working; they iterate over empty arrays until the source lands.

**To unblock:** drop the profile PDF in the repo, or paste the two tables as text.
Then fill the two arrays and flip the three `it.todo`s in `seed.e2e-spec.ts` into real
assertions (73 / 57 / serials 17 and 33 flagged).

Note that `SiteSettings.corporateProjectCount = 73` and `residentialProjectCount = 57`
**are** seeded — those counts are stated in spec §2, so the public headline stats are
already truthful even with the row tables empty.

### Decisions worth knowing

- **`seed.ts` exports `seed(prisma)`** instead of only running on import. The e2e calls
  it in `beforeAll` — twice — so idempotency is proven by the assertions themselves
  rather than by the operator remembering to run `pnpm seed` twice first. It also makes
  the suite independent of test-file ordering, which matters because every other e2e
  file truncates the database in `beforeEach`.
- **Service `summary`/`body` copy is a placeholder.** Only the 7 titles are in the spec.
  The copy restates the title and claims nothing further; replace it with the profile's
  own paragraphs when the PDF is available. Flagged in the file header too.
- **Services are seeded `published: true`** — they are real, verbatim offerings, so the
  public list is not empty. Project case studies stay `published: false` per spec §12.

### Verification

- `pnpm seed` twice against the dev database — counts steady at 7 services, 9 areas,
  3 certifications, 1 admin
- `pnpm test:e2e` — 72 passed, 3 todo, 5 suites
- `pnpm test` (root) — 48 passed (api), 21 passed (types)
- `pnpm typecheck` — clean

---

## Task 15 — Public API surface and full green run — 2026-08-04 — DONE

Plan section: Task 15, the contract test Plan 1B consumes.

### Files

| File | Change |
| --- | --- |
| `apps/api/test/public-api.e2e-spec.ts` | **new** — 12 tests over the unauthenticated read surface plus the residential-privacy assertion |

No `app.module.ts` change was needed — every module was already registered by the end
of Task 13.

### Honest note on the TDD cycle

This suite passed on its first run. It is a contract test over routes that Tasks 12–14
had already built, which is what the plan expects at this point ("FAIL on any route not
yet registered" — none were missing). It was not a red-green cycle, and it should be
read as a regression net for Plan 1B rather than as a driver of new code.

### Decisions worth knowing

- **The suite seeds itself** in `beforeAll` (`resetDb` → `seed`), like `seed.e2e-spec.ts`.
  Every other e2e file truncates in `beforeEach`, so a suite that expected seeded data
  to already be there would break depending on which file jest ran first.
- **Two fixtures are created beyond the seed**: a non-consenting residential row and two
  hero segments. Without them the privacy and `?target=mobile` assertions would pass
  vacuously against empty tables — the seed intentionally creates neither.
- **Count assertions compare against the seed source** (`workingAreas.length`,
  `corporateClients.length`) rather than hardcoded 9 / 73. Data completeness is asserted
  in `seed.e2e-spec.ts`, where the 73/57 checks are the blocked `it.todo`s; here the
  contract is "the route returns everything that was seeded", which holds either way.

### Verification — full green run, per the plan's Step 4

```
pnpm db:start
DATABASE_URL="$TEST_DATABASE_URL" pnpm prisma migrate deploy   → no pending migrations
DATABASE_URL="$TEST_DATABASE_URL" pnpm seed                    → seed complete
DATABASE_URL="$TEST_DATABASE_URL" pnpm test:e2e                → 84 passed, 3 todo, 6 suites
pnpm test                                                      → 48 (api) + 21 (types)
pnpm typecheck                                                 → clean
pnpm lint                                                      → no lint task defined anywhere
```

---

## Phase 1A status — 2026-08-04

Tasks 1–15 complete except the one blocked piece.

| Task | State |
| --- | --- |
| 1–10 (monorepo, Postgres, schemas, Prisma, Nest, auth, media) | done before this session |
| 11 Leads | done — `2e0ed52` |
| 12 Services / working areas / projects | done — `9eafe39` |
| 13 Clients, hero, blog, testimonials, team, certifications, settings | done — `5e3e634` |
| 14 Seed | **partial** — `eaad29a`; client tables blocked on the profile PDF |
| 15 Public API surface | done |

**The one open item:** transcribe 73 corporate + 57 residential rows into
`apps/api/prisma/seed-data/`. Needs the company profile PDF, which is not in the repo.
Three `it.todo`s in `apps/api/test/seed.e2e-spec.ts` are waiting on it.

**Not done and not in Plan 1A's scope:** `pnpm lint` runs nothing — no package defines a
`lint` task, so the root script is a no-op. Worth adding ESLint before Plan 1B.
