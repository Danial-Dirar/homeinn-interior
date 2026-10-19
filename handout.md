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

---

## Plan 1B written — 2026-08-05 — DONE (no code changed)

Planning session only. Nothing in `apps/` or `packages/` was touched.

### Files

| File | Change |
| --- | --- |
| `docs/superpowers/plans/2026-08-05-phase1b-public-web-app.md` | **new** — 19 tasks, 155 steps, the public web app (spec §6 IA, §7 hero, §8 visual, §9 i18n, §11 SEO/privacy, §12 honest content, §13 testing) |
| `handout.md` | this entry |

### The gap the planning found

`GET /api/services`, `/hero`, `/blog`, `/projects` and the rest return bare Prisma
rows — `coverId` and `imageId`, no URL, no alt text, no dimensions, no `srcset`.
`MediaService.toPublic` exists and builds the srcset, but only the authenticated
`/api/media` routes call it. Separately, `Media.blurhash` has been a nullable
column since Plan 1A Task 4 and **nothing has ever written to it**, although spec
§7 names it as the hero's LCP placeholder.

So the web app as of `06f501c` cannot render a single image. Plan 1B's Tasks 1
and 2 close both before any Next.js work starts.

### Three deliberate deviations from spec §8's motion stack

Stated at the top of the plan with reasons, and reversible — only Tasks 9, 10
and 12 are affected.

1. **No GSAP ScrollTrigger.** Spec §7's own markup is `sticky top-0 h-dvh`, which
   *is* the pin; ScrollTrigger would only be computing a number. Sticky plus a
   rAF-throttled progress hook saves ~60 KB against §7's stated budget of
   LCP < 2.5 s on mid-range Android over 4G, and makes progress→transform a pure
   function — which §13 explicitly asks to test as one.
2. **No Framer Motion.** Entrances are fade-and-rise; a 25-line
   IntersectionObserver hook does that without an animation runtime.
3. **No 21st.dev registry.** Of the four blocks §8 names, only the marquee has a
   use in Phase 1B (testimonials seed empty and hide; bento and comparison
   slider are not in the §6 IA). A CSS marquee is ~20 lines and gates on
   reduced-motion more cleanly than a JS one.

Lenis is kept — it is what produces the cinematic feel §8 asks for, and it is small.

### Decisions worth knowing

- **The lead form POSTs from the browser directly to the API**, never through a
  Server Action or route handler. `POST /api/leads` is capped at 5/hour **per IP**;
  proxying through the Next server would put every visitor in the country behind
  one IP and one shared budget. This is written into the plan's global constraints.
- **`<picture>`, not `next/image`.** The API's sharp pipeline already emits AVIF +
  WebP at 480/960/1440/1920; the Next loader would re-encode finished work.
- **Blurhash is decoded server-side to an average colour**, not to a canvas.
  Characters 2–6 of a blurhash are the base83-encoded 24-bit sRGB DC component,
  so a ~15-line pure function gives a server-renderable placeholder with zero
  client JS — which matters because hero segment 1 is the LCP element.
- **Response shapes are TypeScript types in `apps/web/lib/api.types.ts`, not Zod
  in `@homeinn/types`.** `@homeinn/types` keeps request DTOs, which both sides
  genuinely validate. Hand-writing response schemas would create a second source
  of truth that can drift from the Prisma schema silently; `public-api.e2e-spec.ts`
  enforces the contract instead.
- **`packages/ui` is created as spec §4 and §8 specify**, even though its only
  consumer in Phase 1 is `apps/web` (the admin lives in the same app). Flagged as
  a cost rather than silently dropped — reversing it is a one-task change.

### How the blocked profile PDF is handled

Same principle as Plan 1A Task 14: nothing is invented, and every section whose
only source is that document degrades to a hidden section or an honest empty state.

- Vision / Mission / Values / Strengths / Philosophy → five empty keys in **both**
  message catalogues; `CopyBlock` renders nothing for a blank body
- "How we work" (the six key strengths) → `home.processTitle` empty; section hides
- Testimonials, team → tables seed empty; sections hide (spec §12)
- Corporate client rows → `/clients` still states the real 73/57/13 counts, and the
  home track-record section surfaces flagship names only if rows ever exist
- Project case studies → `/projects` shows the honest "being prepared" copy
- Images → `ASSET-CHECKLIST.md` at the repo root plus a `pnpm seed:hero` pipeline
  that ingests whatever is dropped in `prisma/seed-data/placeholders/`

A message-catalogue test enforces the §9 failure mode directly: no key may have a
non-empty English string and an empty Bangla one. Deliberately-blocked copy is
empty in both, which passes.

### Verification

None to run — no code was written. The plan's own gates are per task.

### Next

Awaiting the choice between subagent-driven and inline execution before Task 1.

---

## Phase 1B execution — 2026-08-05 — IN PROGRESS

Branch: `feat/phase1b-public-web` (cut from `main` at `06f501c`). Inline execution,
no subagents. Commits are one per plan task.

### Tasks 1–4 — DONE

| Task | Commit | What landed |
| --- | --- | --- |
| 1 API blurhash + media view | `6952617` | `apps/api/src/media/blurhash.ts` + spec; `MediaService.ingest` now stores a blurhash; `MediaService.view` / `viewMany`; `publicMediaSchema` / `PublicMedia` in `packages/types/src/media.ts` |
| 2 API media on public reads | `ed16489` | `ContentModule` imports `MediaModule`; `hero`, `services`, `projects`, `blog`, `testimonials`, `team`, `certifications` services now include and serialise their media (+ `seo` on detail routes); 3 new e2e in `public-api.e2e-spec.ts` |
| 3 Scaffold `apps/web` | `ddb9868` | `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `vitest.setup.ts`, `app/{layout,page}.tsx`, `app/globals.css`, `lib/env.ts` + test; `.env` / `.env.example` gained `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `WEB_ORIGIN` |
| 4 Design tokens | (pending commit) | `app/globals.css` — the nine §8 colours, the bilingual type scale, `.display-1/2`, `.heading`, `.eyebrow`, `.section-numeral`; `lib/typography.ts`, `lib/fonts.ts`; `app/theme.test.ts` guards the palette |

### Versions that actually resolved

Next 15.5.22 · React 19.2.8 · Tailwind 4.3.3 · Vitest 2.1.9 · next-intl 4.13.4.
The plan's `next-intl` code targets `defineRouting` / `createNavigation` /
`getRequestConfig({ requestLocale })`, all present in 4.x.

### Gotchas hit

- **`pnpm install` exits non-zero on `ERR_PNPM_IGNORED_BUILDS`.** Three packages
  needed approving in `pnpm-workspace.yaml` `allowBuilds`: `unrs-resolver`
  (eslint's native resolver, via `eslint-config-next`), `@parcel/watcher` and
  `@swc/core` (via `next-intl`). When pnpm writes the placeholder
  `set this to true or false` into that file it becomes invalid YAML and every
  later pnpm command fails — replace the placeholder with `true`, don't leave it.
- **`eslint-config-next` is still eslintrc-shaped**, so `eslint.config.mjs` needs
  `FlatCompat` from `@eslint/eslintrc` (added as a devDependency).
- **Three content service unit specs broke on constructor arity** once
  `MediaService` was injected. Each got an inert stub
  (`toPublic: (m) => m, view: (m) => m ?? null, viewMany: (rows) => rows`) —
  they assert filtering behaviour, not serialisation, which
  `media.service.spec.ts` covers.

### Tasks 5–11 — DONE

| Task | Commit | What landed |
| --- | --- | --- |
| 5 Locale routing | `0ef46bd` | `i18n/{routing,request,navigation}.ts`, `middleware.ts`, `messages/{en,bn}.json` (+ parity test), `app/[locale]/{layout,page}.tsx`; root `app/layout.tsx` became a pass-through |
| 6 `packages/ui` | `4a351b2` | `Button`, `Input`, `Textarea`, `Label`, `Sheet`, `Marquee`, `cn`; consumed via `transpilePackages` + a Tailwind `@source` |
| 7 Data layer | `c3c9519` | `lib/{api,api.types,content,locale-text,media}.ts`, `components/media/picture.tsx` |
| 8 Site chrome | `b15dd2e` | `SiteHeader`, `SiteFooter`, `LocaleSwitcher`, `WhatsAppButton`, `SkipLink`, `useScrolled`, `lib/whatsapp.ts`, `test/render.tsx` |
| 9 Hero maths | `4a56a89` | `components/hero/hero-math.ts` — 10 pure functions, 26 assertions |
| 10 Panorama hero | `a34e8fa` | `PanoramaHero`, `HeroStack`, `usePrefersReducedMotion`, `usePinProgress`, `SmoothScroll` (Lenis), `prisma/seed-hero.ts`, `ASSET-CHECKLIST.md` |
| 11 Home sections 1–3 | `459bae4` | `Section`, `Statement`, `ServicesGrid`, `WorkingAreas`, `lib/icons.ts`, `useReveal` |

### Deviation from the plan worth recording

**Task 6 did not run the shadcn CLI.** It needs interactive prompts and a
network round trip; the five primitives were hand-written against the same Radix
packages instead, so the accessibility guarantees that motivated shadcn are
intact. `packages/ui/src/components/ui/*` is ordinary editable source either way.

### Bugs the tests caught in Tasks 9–11

1. **`-0` reaching CSS.** `stripTranslateX` returned `-0` at rest, which would
   have emitted `translate3d(-0vw, 0, 0)`. Normalised to `0`.
2. **Stat labels announced twice.** `<Statement>` had the label in both an
   `sr-only <dt>` and a visible `<span>`. Restructured to a real `dt`/`dd` pair
   with `flex-col-reverse`, so the DOM order stays valid and it is spoken once.
3. **Working-area links were named "01 Landscaping".** The decorative numeral
   was inside the link's accessible name; it is now `aria-hidden`.
4. **A too-tight test, not a bug.** `lightPoolX` continuity was asserted across a
   0.002 step of `p`, which legitimately moves the pool ~1.4% of the viewport.
   Replaced with a fine sweep asserting no adjacent-sample jump.

### Gotchas hit (continued)

- **`next-intl` under Vitest.** It imports `next/navigation` extensionless, which
  Node's ESM resolver rejects from inside the package. Fixed with a `resolve.alias`
  to `next/navigation.js` **plus** `test.server.deps.inline: ["next-intl"]` — the
  alias does nothing until Vite actually transforms the package. The
  `next/navigation` mock in `vitest.setup.ts` then needs the full surface
  (`useParams`, `redirect`, `RedirectType`, …), not just `usePathname`.
- **The API was serving a stale `dist/`.** `pnpm --filter @homeinn/api start` runs
  `node dist/main.js`, and that build predated Plan 1A's content modules — every
  content route 404'd and the web build died on `GET /settings`. Run
  `pnpm --filter @homeinn/api build` after pulling API changes.
- **Port 3000 is taken by another project on this machine.** The web scripts were
  changed from `next dev --port 3000` to plain `next dev` so `PORT` decides;
  local runs use `PORT=3100`. `next start` fails to bind but leaves the previous
  server running, which silently serves a stale build — check `ss -ltnp | grep 3100`
  before trusting what you curl.
- **lucide icons are objects, not functions** (`forwardRef` components), so
  `expect(icon).toBeTypeOf("function")` fails.

### Verification so far

- `pnpm --filter @homeinn/api test` — 55 passed, 11 suites (was 48/8)
- `DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @homeinn/api test:e2e` — 87 passed, 3 todo, 6 suites (was 84)
- `pnpm --filter @homeinn/ui test` — 4 passed
- `pnpm --filter @homeinn/web test` — 104 passed, 17 files
- `pnpm --filter @homeinn/web build` — clean; `/en` and `/bn` prerendered
- `pnpm --filter @homeinn/web lint` — 0 errors, 0 warnings
- `pnpm typecheck` — clean across 5 packages
- Live check on `PORT=3100`: `/` → 307 → `/en`; `/bn` carries `lang="bn"`,
  `font-bangla`, `৭৩`, and Bangla service and area names with no English leaking.

### How to run it locally

```bash
pnpm db:start
pnpm --filter @homeinn/api build && pnpm --filter @homeinn/api seed
pnpm --filter @homeinn/api start                 # :4000
PORT=3100 pnpm --filter @homeinn/web dev         # :3100 — 3000 is taken
```

---

## Phase 1B — COMPLETE — 2026-08-07

All 19 tasks landed on `feat/phase1b-public-web`.

### Tasks 12–19

| Task | Commit | What landed |
| --- | --- | --- |
| 12 Home sections 4–8 | `1cfc97a` | `SelectedProjects`, `TrackRecord`, `Process`, `Testimonials`, `Credentials`, `ProjectCard` |
| 13 Lead form | `db87e59` | `lib/leads.ts`, `LeadForm`, `Cta`, `/contact` |
| 14 Services pages | `e54e4b2` | `/services`, `/services/[slug]`, `lib/rich-text.ts` + `RichText` |
| 15 Projects pages | `4c202b4` | `/projects`, `/projects/[slug]`, `ProjectFilterBar`, `lib/project-filter.ts` |
| 16 Clients + about | `1db180b`, `2fe2a1c` | `/clients`, `/about`, `CorporateTable`, `ResidentialSummary`, `CopyBlock` |
| 17 Blog | `9db9615` | `/blog`, `/blog/[slug]`, `PostCard`, `lib/dates.ts` |
| 18 SEO | `b987b0f` | `lib/seo.ts`, `JsonLd`, per-page `generateMetadata`, `sitemap.ts`, `robots.ts` |
| 19 E2E + a11y | `d6d7123` | error boundaries, `[locale]/[...rest]` catch-all, Playwright config, 5 e2e specs |

### What the e2e suite caught that nothing else did

These were all real defects, found only once a browser rendered the pages:

1. **The header was invisible on six of seven pages.** `SiteHeader` was
   `text-sand` with a transparent background on every route, but only the home
   page opens on a dark hero — everywhere else the ground is `bone`, and
   sand-on-bone is **1.18:1**. It now keeps an ink scrim always, slightly
   lighter over the hero. Legibility no longer depends on what is behind it.
2. **The lead form could not submit at all.** `main.ts` allowed a single CORS
   origin and the dev server runs on :3100. `WEB_ORIGIN` now accepts a
   comma-separated list — worth having anyway, since local and production
   origins differ.
3. **`brand` failed AA wherever it was small text.** `#E01B24` is 4.32:1 on
   `bone` and 4.07:1 on `ink`. Fixed without touching the §8 palette: the
   section numeral is fixed at 24px (large-text threshold, and deliberately
   outside `--type-scale`, which would have shrunk it to 22.56px on Bangla
   pages); the solid button uses `text-white` (bone on brand is 4.32:1); the
   active filter chip is filled rather than brand-coloured text; "view all"
   links are ink with a brand hover — which also puts them back inside §8's
   "brand is CTA, active nav, focus ring, section numerals — nothing else".
4. **`.eyebrow` hardcoded `sand-dim`**, which is 2.68:1 over `bone`. It now
   inherits `currentColor` and each ground picks its own value.
5. **The localised 404 never rendered.** An unmatched path under `[locale]`
   falls through to the root `app/not-found.tsx`, not `[locale]/not-found.tsx`.
   Added `app/[locale]/[...rest]/page.tsx` calling `notFound()`.

### Deliberate test-design decisions

- **The lead e2e runs on one browser only** and accepts either the success or
  the throttled message. `POST /api/leads` is capped at 5/hour/IP and every
  Playwright project shares this machine's IP, so a second browser would just
  exhaust the budget. The assertion still fails on the *generic* error — which
  is exactly what the CORS bug produced, so the test that found it still would.
- **No hero visual-regression baselines yet.** Spec §13 asks for screenshots at
  five scroll positions, but with zero hero segments seeded the baselines would
  capture the text-only fallback and would all have to be thrown away the moment
  real images land. Deferred until `ASSET-CHECKLIST.md`'s hero slots are filled;
  the reduced-motion and keyboard tests are in place.

### Final verification

```
pnpm test        → api 55 · web 172 (33 files) · ui 4 · types 21
pnpm typecheck   → clean, 5 packages
pnpm lint        → clean
apps/api e2e     → 87 passed, 3 todo, 6 suites
apps/web e2e     → 50 passed, 2 skipped (desktop + mobile, axe on 7 routes × 2 locales)
pnpm --filter @homeinn/web build → 33 pages
```

Live smoke on `:3100`: all 7 routes × 2 locales return 200, `/` → 307 → `/en`,
`robots.txt` and a 28-URL `sitemap.xml` serve, `LocalBusiness` + `Organization`
JSON-LD present, hreflang `en`/`bn`/`x-default` on every page, and a real lead
posted from the browser lands in Postgres with its phone normalised to `01…`.

### Still open

- **Everything blocked on the company profile PDF** (see `ASSET-CHECKLIST.md`):
  73 corporate + 57 residential rows, the five About copy blocks, the "How we
  work" strengths, and every image slot. Each degrades to a hidden section or an
  honest empty state, never to invented content.
- **Hero images.** The panorama currently renders its text-only variant because
  `HeroSegment` is empty. Drop files in
  `apps/api/prisma/seed-data/placeholders/` and run
  `pnpm --filter @homeinn/api seed:hero`.
- **`pnpm lint` covers `apps/web` only.** `apps/api`, `packages/types` and
  `packages/ui` still define no lint task.
- **Plan 1C** — the admin CMS (spec §10) and the admin half of §13's e2e list.

---

## Media intake — prepared, awaiting the client's photo/video folder — 2026-08-07

Muhammad is bringing a large, possibly unsorted folder of real project
photography and video into the repo. This section is the state to resume from.

### Files

| File | Change |
| --- | --- |
| `apps/api/scripts/media-inventory.ts` | **new** — read-only triage: walks a folder, classifies image/video/raw, reads dimensions via sharp and duration via `ffprobe`, groups by top-level directory, writes `media-inventory.json` |
| `apps/api/package.json` | added `media:inventory` script |
| `apps/api/.gitignore` | ignore the generated report |

Run it with `pnpm --filter @homeinn/api media:inventory <folder>`. It writes
nothing to the database and modifies no file in the source folder.

### Security fix on that script

A background commit review flagged **argument injection into an external
process**, and it was right. `execFile` runs without a shell, so there was no
shell injection — but the video path was passed to `ffprobe` as a bare
positional argument, and a file named `-loglevel` (or any leading dash) would
have been parsed as an option instead of a path. This script's entire purpose is
reading a folder supplied by someone else, so that is a live path, not a
theoretical one. Fixed two ways: the path now goes through `-i`, and the walk
root is `resolve()`d so no path can begin with a dash. Verified by dropping a
file literally named `-loglevel.mp4` into a test folder — it is now probed
correctly instead of swallowed as a flag.

### The hero video: NOT previously planned, and nothing supports it today

To be explicit, because it was asked: **no, this was never in the plan.** Spec
§7 and all of Plan 1B describe an image panorama — a strip of stills that pans
horizontally on scroll. Video appears nowhere in the spec, the schema, the media
pipeline, or `ASSET-CHECKLIST.md`. It is new scope.

What is actually missing:

| Layer | State |
| --- | --- |
| `Media` model | no `duration`, no `poster`, no video kind — only `width`/`height`/`blurhash` |
| `MediaService.ingest` | hard-rejects any mime that is not `image/*`, then runs sharp for AVIF/WebP derivatives |
| `HeroSegment.imageId` | **required** FK to `Media` — a video-only segment cannot exist |
| `PanoramaHero` | renders `<Picture>` per segment; no `<video>` path, no poster, no autoplay/reduced-motion gate for it |

Good news: `ffmpeg` and `ffprobe` are installed on this machine, so poster-frame
extraction and transcoding to a web-safe MP4/WebM are both possible locally.

### The open question, deferred by Muhammad until the folder lands

Three options were put to him; he chose to defer and asked to be asked again
once the real footage is in hand. Ask this again then:

1. **Background loop, panorama dropped.** A 10–20s muted autoplay loop behind
   the tagline. Simplest and the most familiar interior-studio look — but the
   whole §7 scroll-driven pan goes unused: `hero-math.ts`, the sticky pin, the
   seam masks and the light pool all become dead code.
2. **Video as one segment inside the panorama.** The pan survives; one or two of
   the six rooms become moving shots instead of stills. Everything built stays.
   Requires each clip to loop cleanly and to match the colour temperature of the
   stills either side of it.
3. **Video first, panorama below it.** Both survive, at the cost of a much
   longer home page and of loading a video *and* six hero images — which spec
   §7's budget (LCP < 2.5s on a mid-range Android over 4G) will not absorb
   without dropping the video on mobile.

Whichever is chosen, mobile almost certainly gets a poster image rather than the
video, per that same budget.

### How to make the folder import cleanly

Nothing needs sorting perfectly — the inventory script exists precisely to make
sense of a messy drop. But the import is far more automatic if the top level of
the folder is **one directory per completed project**, because that directory
name becomes the project grouping:

```
<folder>/
  bfidc-head-office/          → one Project, its images become cover + gallery
  cmh-dermatology-dhaka/
  prime-medical-college/
  loose files at the root     → reported as "(loose files)", sorted by hand
```

A `README.txt` or filename hint naming the district and the year helps; both are
real `Project` columns (`locationEn/Bn`, `year`).

### What can and cannot be created automatically

This is the spec §12 boundary, and it constrains the importer:

- **Can** be derived: the project grouping, cover and gallery `Media` rows,
  slug, `workingArea` (mapped to one of the nine seeded categories), sort order.
- **Cannot** be invented: descriptive copy, client names, areas, years, or
  Bangla translations. Every imported project therefore lands as
  `published: false` with its title taken from the folder name, for a human to
  confirm — which matches the existing rule that case studies stay unpublished
  until the client confirms details.
- The 73 corporate / 57 residential **client tables stay blocked** regardless.
  Photographs do not substitute for the profile PDF's row data.

### `prompt_for_sort.md` — the off-machine sorting brief

`prompt_for_sort.md` at the repo root is a self-contained prompt to hand to an
AI agent on whichever machine holds the archive. It needs neither this repo nor
the database. It carries: the nine `WorkingArea` slugs verbatim (an unrecognised
slug fails the import), the §15 minimum image widths, the target folder layout,
a `manifest.json` schema, the §7 hero-set criteria, and — first, before
anything else — the §12 honest-content rule, spelled out as "never invent a
fact, `null` is the correct answer".

Three things in it are deliberate and should not be softened if it is edited:

- **`year` and `location` may only come from a source filename or folder name**,
  never from reading a signboard in a photo. Those two fields are real `Project`
  columns and a guess there becomes a false public claim.
- **Nothing is deleted** — rejects move to `_rejected/`, so a wrong call is
  always recoverable.
- **Video is copied, never transcoded**, because the hero-video decision is
  still open and re-encoding now would destroy the source we would need.

The manifest example in it is checked as valid JSON and all nine slugs are
verified present against `seed-data/working-areas.ts`.

### The folder arrived — 2026-08-09

`media_dump/` landed at the repo root: **207 files, 1.1 GB, completely flat** —
197 JPEG + 10 MP4, phone-camera names like `IMG_20240608_160750.jpg`. Added to
`.gitignore`; 1.1 GB of binaries does not belong in the repository.

Inventory says **192 of 197 photos are ≥1920px** (hero-grade) and 193 are
≥1440px (cover-grade). Only 4 are too small. The 10 videos are all 1280×720,
15–144 s, ~570 MB total — usable but not high resolution.

**The filenames carry timestamps, which is the honest grouping signal.** Photos
taken minutes apart on one date are one site visit, so clustering with a >6h gap
yields **29 sessions**. That is a real project split derived from the data, not
a guess about content.

### What is in the archive

I built one contact sheet per session and looked at all 25 that contain stills
(four sessions are video-only). Written to
`apps/api/prisma/seed-data/media-dump-classification.json`, with the category,
a confidence level and a note on what is actually visible in each.

| Category | Sessions | Photos |
| --- | --- | --- |
| `home-furniture-interior-exterior` | 11 | 134 |
| `factory-works` | 6 | 23 |
| `corporate-office-bank-furniture` | 5 | 22 |
| `showroom-outlet` | 2 | 7 |
| `industrial-building-steel-structure` | 1 | 6 |

Session 17 is flagged **low confidence** — deep shelving bays around a window,
which could be a pharmacy, a library or a retail back wall. Sessions 13, 15, 20
and 21 are video-only and unclassified.

### `factory-works` — a tenth working area

Added to `seed-data/working-areas.ts` at `sortOrder: 9` and seeded. Unlike the
other nine it is **not** from the company profile's list, and that is recorded
in a comment beside it. It is defensible as a separate category because
`industrial-building-steel-structure` means a building the company erects, while
this is what the workshop *makes* before it reaches a site — and six sessions of
the archive are exactly that. It appears automatically in the home page's "Where
we work" list and in the `/projects` filter, because both render from the API.

### Stock photography: where it is and is not allowed

Muhammad asked for professional images pulled from the internet. The split I am
working to, and why:

- **Projects: real photographs only.** Publishing someone else's interiors as
  this company's completed work is both a copyright problem and precisely what
  spec §12 exists to prevent. It is also unnecessary — 192 usable photos of
  their own work now exist, covering five categories.
- **Hero: free-licence placeholders are legitimate.** The hero is atmosphere,
  not a claim about a specific job, and spec §15 already sanctions
  Unsplash/Pexels placeholders provided each licence is recorded per file in
  `ASSET-CHECKLIST.md` and the slot is marked as a stand-in. Outbound network
  access from this machine is confirmed working.

Worth knowing before that step: many archive photos are mid-finish — packaging
on worktops, loose wiring, tools in frame — and phone-camera quality. That is
presumably why polished images were wanted. The answer is to pick the cleanest
real frames for projects and let the hero carry the polish.

### Two things found while looking that need a human

1. **Client names are legible on signage** in sessions 3, 6 and 8 (a reception
   sign and an IELTS consultancy frontage). Spec §11 does permit publishing
   corporate client names — but not on my reading of a photograph. Confirm the
   names before any of them go near a `clientName` field.
2. **Identifiable faces** appear in at least sessions 8 and 29 (a man at a desk,
   a reflection in a mirror). Those frames must not be published.

### The archive is imported — 2026-08-09

`apps/api/prisma/seed-projects.ts` (`pnpm --filter @homeinn/api seed:projects`)
turned the 29 sessions into **25 draft projects**, one per session, cover plus up
to 8 gallery images each. Idempotent on slug, so re-running is safe. The run
took roughly 15 minutes — every image goes through sharp for eight derivatives.

What it writes, and only this:

- `workingArea` from the classification file, `year` from the filename date,
  `sortOrder` from the session number, and the photographs.
- `titleEn` / `titleBn` are **provisional**: category name + month + year, e.g.
  "Factory Works — October 2024" / "ফ্যাক্টরির কাজ — অক্টোবর ২০২৪". Both are
  derived from facts, neither is a real project name. Rename them.
- `locationEn/Bn`, `descriptionEn/Bn` are empty strings, `clientName` and
  `areaSqft` null. The columns are non-nullable, and the UI drops empty facts
  rather than rendering blank rows.
- Alt text comes from the `seen` field of the classification — a real
  description of what is visible, which makes it honest alt text rather than a
  generic placeholder.

Curation: images below 1440px are skipped, and where a session has more than
eight the gallery is sampled **evenly across the session** rather than taking
the first eight — the photographer walks through a space, so an even spread
samples different rooms while consecutive frames are the same corner. The two
frames containing identifiable people (`IMG_20241021_173259.jpg`,
`IMG_20260728_175204.jpg`) are excluded by name; the run log shows 16 of 17 and
26 of 27 usable for those two sessions, which is that exclusion working.

### The hero is now the company's own work, not stock

Session 29 turned out to be exactly what spec §15 asks the client for: one flat,
one session, room to room. Five landscape frames were staged into
`seed-data/placeholders/` and ingested — **Entrance → Living Room → Bedroom →
Kitchen → Dining**, with Bangla labels (প্রবেশপথ, বসার ঘর, শোবার ঘর, রান্নাঘর,
খাবার ঘর) set afterwards, since room names are labels rather than claims.

No stock imagery was used anywhere. Wikimedia Commons was tested and does return
CC-licensed interiors with usable licence metadata — but six photographs of six
different properties cannot read as one continuous interior, which is the whole
premise of §7. The client's own sequence does. If the hero is ever restaged from
stock, that trade-off is the thing to weigh.

Note the archive is all 4160×3120 (4:3 phone photos) — there is not a single
16:9 frame. That is fine: `object-fit: cover` plus `focalX` crops them, and the
first filter written for this was too strict at `aspect ≥ 1.5`.

### Published locally, deliberately

All 25 are `published: true` **in the local database only** so the work can be
looked at, and four are `featured` for the home page. The provisional titles are
not fit for a public deploy. Before this goes anywhere real, either rename them
or set them back:

```bash
psql "$DATABASE_URL" -c 'UPDATE "Project" SET published = false;'
```

### Two fixes this uncovered

1. **`ProjectCard` rendered a leading separator.** It concatenated
   location/year/area, so an imported project with no location showed " · 2024".
   Now joins the non-empty parts.
2. **Next's fetch cache served an empty hero.** `.next/cache` persists across
   builds, so a build that ran while `HeroSegment` was empty kept returning `[]`
   for five minutes of `revalidate`. After seeding content, `rm -rf
   apps/web/.next/cache` before rebuilding — otherwise the page silently renders
   the zero-segment fallback and looks like a bug in the hero.

### Verification

- API: 5 hero segments with Bangla labels, 25 projects, 6 under `factory-works`,
  blurhash and AVIF/WebP srcsets present on every image.
- Web: 83 static pages (was 33), `/en/projects` 25 cards, 10 filter chips,
  `?area=factory-works` 6 cards, `/bn` shows all five Bangla room labels.
- `pnpm test` 252 passed · `pnpm typecheck` clean · `pnpm lint` clean.

### Still to do on the archive

- **Rename the 25 projects.** Provisional titles are the biggest gap.
- **Session 17** is still low confidence — pharmacy, library or retail?
- **Client names** legible on signage in sessions 3, 6 and 8 need confirming
  before they go near `clientName`.
- **The 10 videos are untouched** — the hero-video question is still open.
- **Locations and years for real** — year is set from filenames, which is only
  the date the photo was taken, not necessarily the completion year.

### Hero pan smoothing — 2026-08-09

The pan was welded to the scrollbar: `usePinProgress` set React state from the
section's rect on every scroll event, so the strip's position *equalled* the
scroll position and every wheel notch was visible as a step. Two changes:

1. **`approach()` in `hero-math.ts`** — exponential damping, so scroll sets a
   *target* and the camera eases toward it. Frame-rate independent
   (`target + (current - target) * e^(-lambda*dt)`), which a naive
   `current += (target - current) * 0.1` is not — that runs ~2.4× faster on a
   144Hz display. There is a test for exactly that property.
2. **`useSmoothProgress` replaces `usePinProgress`** and calls back on each
   animation frame instead of setting state. `PanoramaHero` writes the strip,
   foreground, light pool, progress bar and label opacities straight to the DOM
   through refs. Re-rendering five full-bleed images at 60fps was half the
   stutter. The rAF loop parks itself once settled.

**Tuning, and the mistake worth remembering.** The first attempt used
`LAMBDA = 5` and left Lenis at `duration: 1.1`, which measured **1950 ms** to
come to rest after one wheel flick — syrup, not momentum. The two eases
compound: Lenis smooths the scroll position that this then smooths again.
Settled on `LAMBDA = 9` and Lenis `0.9`:

| | |
|---|---|
| 50% of the travel | 215 ms |
| 90% | 480 ms |
| 99% | 801 ms |

Measure before changing either number — a Playwright script reading
`DOMMatrixReadOnly(getComputedStyle(strip).transform).m41` after
`mouse.wheel()` is how these came out.

### The hero is a crossfade now, not a pan — 2026-08-09

Muhammad sent a screenshot of the hero resting mid-pan: half a kitchen beside
half a dining room, with both room labels overlapping into unreadable text.

**The pan was the wrong treatment, and the reason is worth keeping.** Spec §7's
horizontal strip works when the photographs genuinely stitch — adjacent frames
of one continuous space, where the seam masks and the 1.35× parallax foreground
have a real joint to hide. The archive is discrete room photographs. Panning
them does not hide a seam; it puts two unrelated rooms on screen at once, and no
amount of masking fixes that because the discontinuity is the content.

So: one room fills the screen, scroll crossfades to the next, and it **always
comes to rest on a whole photograph**.

- `snappedProgress(p, count)` quantises scroll to the nearest whole segment;
  `useSmoothProgress` takes an optional `snapTo` and eases to that. Resting
  state is therefore always exactly one image at opacity 1.
- `segmentOpacity` replaces `labelOpacity` and drives both the image and its
  label from one number, so a label can never outlive its room. Adjacent
  opacities sum to 1 during the fade and a third room is never lit — both tested.
- `driftX` gives each frame a 4vw sideways drift so a still frame is not dead,
  zero at rest, and never wide enough to expose a neighbour. Frames are 108vw
  wide and offset -4vw to give it somewhere to go.
- Faded frames get `visibility: hidden`, which keeps them out of the
  accessibility tree — a screen reader hears one room, not five. That is why the
  LCP test now queries `container.querySelectorAll("img")` instead of by role.
- `stripTranslateX`, `foregroundTranslateX`, `stripWidth` and `segmentWindow`
  are gone rather than left as dead code with passing tests. `HeroSegment.
  foreground` is unused by this treatment but stays in the schema — it is what a
  real stitched panorama would need.

Verified by scripting the browser: after each wheel step, exactly one frame is
at opacity 1 and zero frames are partial.

**If a true stitched panorama ever arrives**, the pan is the better treatment
and belongs back — the note at the top of `hero-math.ts` says so.

### A second phone line — 2026-08-09

`01818843999` now appears everywhere the original number does, each with its own
WhatsApp control.

It went in as **two nullable `SiteSettings` columns** (`phoneSecondary`,
`whatsappSecondary`, migration `20260808234815_add_secondary_phone`) rather than
being hardcoded — it is a business fact the admin will need to edit, and a
company with one number is still a valid configuration.

- `components/layout/phone-lines.tsx` owns the decision. `phoneLines(settings)`
  is the single place that knows whether a second line exists, so no component
  null-checks it. A blank or whitespace-only value is treated as absent, and
  `whatsappSecondary` falls back to the number itself.
- `whatsapp-icon.tsx` is WhatsApp's own glyph, inline, inheriting
  `currentColor`. It replaced lucide's generic `MessageCircle` in the header
  too. Used the way their brand guidelines allow — on a control whose only job
  is opening a chat with us — and it is documented as not being a general
  messaging icon.
- Each WhatsApp link is named per number (`Chat on WhatsApp — 01818843999`), so
  a screen reader does not hear two identical links.
- JSON-LD `telephone` becomes an array when a second line exists and stays a
  bare string when it does not; both are valid schema.org and both are tested.

`seed.ts`'s settings upsert previously had `update: {}`, which meant an
already-seeded database would never pick up new fields. It now pushes the second
number on re-seed.

Watch out: `prisma migrate dev --skip-generate` leaves the client stale, and the
seed then fails with an opaque Prisma error. Run `prisma generate` after.

### Social icons moved up, WhatsApp moved out — 2026-08-09

Facebook and Instagram were only ever in the footer as text links. They are now
icons in the header's top right, and WhatsApp left the header for a floating
button.

- `social-links.tsx` renders Facebook / Instagram / YouTube from settings,
  **only the ones configured** — the fixture has no YouTube URL and no link
  appears, because a dead social link is worse than none.
- `whatsapp-float.tsx` is fixed bottom-right, on every page, hidden only at the
  top of the home page so it never lands on the hero's first frame. It reuses
  the same `usePathname() === "/" && !scrolled` rule the header uses, so the two
  cannot disagree. Verified: opacity 0 at home top, 1 after scrolling, 1 on
  `/contact`.
- `whatsapp-button.tsx` is deleted. The CTA section lost its separate WhatsApp
  button too — `PhoneLines` already puts one beside each number there, and the
  float is on the page regardless.

**White on WhatsApp green is 1.98:1** and fails AA outright — this is WhatsApp's
own brand pairing and axe caught it immediately. The button keeps `#25D366`,
which is what makes it recognisable, but uses `ink` for the label and glyph:
9.7:1. Do not "fix" it back to white.

### Client logo wall — 2026-08-09

Marks on `/clients`, scrolling right to left. `client_logos/` at the repo
root holds the prepared WebP files plus a `_source/` of the originals.

**Where each came from**, because a logo is someone else's trademark and the
provenance matters:

| Client | Source | Note |
|---|---|---|
| foodpanda | Wikimedia Commons, `Foodpanda logo since 2017`, **public domain** | their own site returns 403 to any non-browser request |
| HNC Outsourcing | `hncoutsourcing.com/logo.svg` | matches the reception sign in media-dump session 3 |
| LEC Abroad | `lecabroad.com/storage/uploads/setting-images/…` | matches the sign in session 8 |

The first LEC file scraped was an app-promo banner, not the logo — worth
opening what you download rather than trusting the filename.

Prepared with `magick -density 600 … -resize x400 -trim +repage -border 8`,
then WebP at height 200. Trimming matters: each logo is then measured by its own
ink, so a wide wordmark and a square mark sit at a comparable visual weight.
5–9 KB each.

**`ClientLogo` is a new model, deliberately separate from `CorporateClient`.**
That table is the profile PDF's 73-row project ledger keyed by its own serials;
this is a short curated wall with a different lifecycle. Keeping them apart
means the blocked PDF import cannot collide with this. Seeded by
`pnpm --filter @homeinn/api seed:logos`, idempotent on name, served from
`GET /api/client-logos`.

`ClientLogoWall` marquees at four or more logos and lays out a plain centred row
below that — a three-item loop reads as the same marks going round rather than
as a client list. Speed scales with the count so the pace stays even as the list
grows.

### Two bugs this surfaced

1. **`Picture` painted a background behind transparent logos.** It sets the
   blurhash average colour on every `<img>`, which is right for a photograph and
   turned a black wordmark into a black rectangle and HNC's mark into a
   blue block. The wall passes `style={{ backgroundColor: "transparent" }}`,
   which wins because caller styles are spread last.
2. **`Marquee`'s duplicated track was keyboard-reachable.** It was `aria-hidden`
   but its links were still tabbable — axe's `aria-hidden-focus`, a real trap.
   The copy is now `inert` too. Fixed in `packages/ui`, so every future marquee
   gets it.

### Adding a client later

Drop the file in `client_logos/`, add a row to `CLIENTS` in
`prisma/seed-client-logos.ts`, run `seed:logos`. The comment there says it
plainly: only add a mark the company has confirmed as a client — publishing a
logo asserts a working relationship.

### Mobile — 2026-08-09

Two real defects, found by driving a phone viewport rather than by looking.

1. **Navigation was unreachable on a phone.** Every page scrolled 219px
   sideways, pushing the hamburger, the language toggle and the socials off
   screen. The header looked like the culprit — it measured 612px on a 393px
   viewport — but that was the symptom: `inset-x-0` stretches a fixed element to
   the *scroll* width. The cause was the lead form's `<select>`, which sizes
   itself to its longest option, and "Home Furniture & Office Furniture Supply
   (Customized Design)" is 592px wide. A flex or grid item defaults to
   `min-width: auto` and will not shrink below its content, so it dragged the
   whole page with it. Fixed with `w-full min-w-0` on the selects and `min-w-0`
   down the form's grid, plus `min-w-0 truncate` on the header brand as a
   second line of defence. Verified 0 overflow at 320/360/375/393/412/430px.
2. **`getHero("desktop")` was hardcoded**, so a phone got all five rooms at
   desktop pacing instead of the curated `showOnMobile` subset spec §7 calls
   for. The page now fetches both strips and `PanoramaHero` picks by viewport
   via `useIsMobile`. Rendering two heroes side by side was tried first and
   rejected — it duplicates the DOM, the images and the `#after-hero` anchor.

### Why nothing loaded on the real phone

`PUBLIC_MEDIA_BASE_URL` was `http://localhost:4000/media`, so every image URL
the API hands out points at **the phone itself**. Nothing could ever load. Page
HTML was fine because those fetches are server-side.

For LAN testing, `.env` now uses this machine's address (192.168.0.167):

```
PUBLIC_MEDIA_BASE_URL="http://192.168.0.167:4000/media"
NEXT_PUBLIC_API_URL="http://192.168.0.167:4000/api"
NEXT_PUBLIC_SITE_URL="http://192.168.0.167:3100"
WEB_ORIGIN="http://localhost:3000,http://localhost:3100,http://192.168.0.167:3100"
```

Both servers already bind `*` rather than loopback. `NEXT_PUBLIC_*` is inlined
at build time, so the web app must be **rebuilt** after changing it; the API
only needs a restart. If the IP changes, all four values change with it.

This is exactly the class of problem the Vercel move removes — there is one real
origin and no localhost anywhere.

### Nav order and the merged 2D/3D service — 2026-08-10

**Nav is now Home · Services · Projects · Clients · Blog · About · Contact** —
About moved from second to sixth. Work before company. The footer follows the
same order minus Home, and a test pins the sequence so it cannot drift back by
accident.

**The profile's "2D Plan & Solution" and "3D Model & Visualization" are merged**
into one row, `2d-3d-plan-model-visualization`. Worth being clear about what
that means: those were two of the seven services taken verbatim from the company
profile (spec §2), so the service list is no longer the profile's list. This was
Muhammad's call, and the seed file says so at the merge site along with how to
split them again.

Knock-ons that had to move with it:

- `sortOrder` was left with a gap; the two later services were pulled up to
  0–5.
- Both catalogues said "Seven ways…" and "Seven services…" — now six, in English
  and Bangla. A stale count is a false claim like any other.
- Seeding creates the merged row but cannot know the old two should go, so they
  were deleted explicitly:
  `DELETE FROM "Service" WHERE slug IN ('2d-plan-solution','3d-model-visualization');`
  Checked first that no `Lead` referenced either (`serviceId` count was 0) —
  that FK would have blocked the delete and, worse, orphaned a real enquiry.
- Static pages dropped 83 → 81: two service detail routes fewer.

Six services also happen to fill a three-column grid exactly, so the empty-cell
problem fixed earlier no longer has anything to show.

### The domain is owned — 2026-08-12

Spec §16 listed this as an open question: "`homeinnbd.com` does not currently
resolve. Confirm the registrar and whether it is owned." **Answered: it is
owned**, and the DNS is live — both `homeinnbd.com` and `www.homeinnbd.com`
answer, currently with a parked `A` record pointing at `127.0.0.1`. Nothing is
served (`curl` gets no response), which is exactly what a registered but
unconfigured domain looks like.

The registrar panel is a LogicBoxes/ResellerClub reseller
(`webmartcp.myorderbox.com`). **Its login is deliberately not recorded in this
repo** — it arrived over chat, and a domain-panel password in a git history is a
password you can never take back. It belongs in a password manager, and that one
should be rotated because it has been in a chat log.

Practical consequence: the nameservers already work, so pointing the domain at a
deploy is an A/CNAME change rather than a nameserver migration. (Superseded
below — the chosen path does need a nameserver change after all.)

### The home connection is behind CGNAT — port forwarding is off the table — 2026-08-12

The decision is to self-host rather than use Vercel, from Muhammad's own PC for
now and a VPS later, on `homeinnbd.com`. Spec §14 recommended exactly this
shape, so this is not a departure from the plan.

The naive version of it does not work here. `tracepath` to `1.1.1.1` leaves the
LAN and then stays in private address space for four more hops:

    2:  172.16.100.53
    3:  172.16.16.201
    4:  10.60.80.1
    5:  10.60.80.134

That is carrier-grade NAT. The public address the internet reports
(`103.72.212.128`) is the ISP's shared egress, not this router's. **The router
has no public WAN address, so there is no port to forward** — an `A` record
aimed at the house would resolve to an address that belongs to the ISP and is
shared with hundreds of other subscribers. Standard for Bangladeshi residential
broadband; worth writing down so it is not rediscovered later.

**Chosen answer: Cloudflare Tunnel.** `cloudflared` on the host dials *out* and
holds the connection open, and Cloudflare routes inbound requests down it. CGNAT
is irrelevant because nothing has to reach in. It also terminates TLS, which
removes the Caddy/Let's Encrypt half of the §14 recommendation, and it keeps the
home IP off the public record.

The cost is a real one: the free tunnel requires the domain's **nameservers** to
move to Cloudflare, which is why the note above is superseded. That is a change
in the myorderbox panel and it is reversible.

Two things to keep in view:

- **Uptime is the PC's uptime.** Fine for showing the client, not fine as the
  permanent home of a business's public site.
- A free-tier Oracle VM (`haifa-oracle`) is already in the tailnet, offline for
  11 days. If it is still live it is a public-IP VPS at no cost, and the "buy a
  VPS later" step may already be done.

Nothing in the app changes between the two. Moving from the tunnel to a VPS is a
DNS change, because `StorageService` already abstracts the media directory and
the compose file is the same either way.

### A suspend mid-write corrupted git and the web build — 2026-08-17

`next start` failed with "Could not find a production build in the '.next'
directory", and every git command printed `object file .git/objects/86/144f7… is
empty`. Two symptoms, one cause.

The clock is the tell. The zero-length object and `handout.md` both carry an
mtime of **Aug 12 17:52**, while the machine now reports **Aug 17 02:34**. The
commit was made, the machine suspended seconds later, and it never came back
cleanly — so the directory entries survived and the contents did not. Three
objects were lost, and they are exactly one commit's worth:

    b208041  blob    the new handout.md
    5f3ea5b  tree    the new root tree
    86144f7  commit  which refs/heads/main pointed at

`.next` was truncated the same way: manifests present, `BUILD_ID` absent, which
is precisely the file `next start` looks for. The disk was never full — 78G free
on a 92%-used btrfs volume — so this is not a space problem and not a failing
drive.

**Recovery, in case it happens again.** The working tree is not part of the
object database, so the actual writing was never at risk; only the commit was.

1. Back the edited file up outside the repo first.
2. Delete the zero-length objects — `find .git/objects -type f -empty`. Git
   treats an existing object file as proof the object is stored, so an empty one
   makes every later write silently no-op. They have to go.
3. `git symbolic-ref HEAD refs/heads/main` and `git update-ref refs/heads/main
   <last good commit>`.
4. `rm .git/index && git reset` — the index cached the dead tree too.
5. `git fsck`. Reflog entries for the dead commit still error; they are
   cosmetic, and `git reflog expire --expire-unreachable=now --all` clears them.
6. Re-commit. Verify with `git cat-file -s HEAD` — a non-zero size is the point.

Rebuilt with `rm -rf apps/web/.next` then a full `next build`, carrying the LAN
values so phone testing keeps working:

    env NEXT_PUBLIC_API_URL=http://192.168.0.167:4000/api \
        NEXT_PUBLIC_SITE_URL=http://192.168.0.167:3100 \
        pnpm --filter @homeinn/web build

95 pages. `/en`, `/bn`, `/en/furniture`, `/bn/furniture`, `/en/clients` and
`/en/projects` all answer 200. Re-committed as `530d1e2`.

**Checking a build properly:** `test -d .next` is not the test — a half-written
build leaves the directory behind. `test -f .next/BUILD_ID` is.

### Still to build when the folder arrives

1. A category mapper — folder name → one of the nine `WorkingArea` slugs, with
   a confirm step rather than a silent guess.
2. `seed-projects.ts`, alongside the existing `seed-hero.ts`: one draft `Project`
   per folder, cover = first usable image, rest into the gallery.
3. HEIC/RAW conversion, if the inventory reports any — sharp cannot decode them
   without libheif.
4. Alt text. `Media.altEn`/`altBn` are **required** and cannot be auto-written
   truthfully; the importer will need to stage placeholders that the admin
   (Plan 1C) forces someone to fill.

### WhatsApp moved to the second line, and two marks withdrawn — 2026-09-14

**WhatsApp is now one number, `01818843999`.** Both phone numbers stay; only the
WhatsApp account changed. That broke an assumption baked into the code: the
float read `settings.whatsapp`, which is the *first* line's account, so simply
clearing it would have removed the button altogether, and simply moving the new
number into that field would have hung a WhatsApp icon beside a number that does
not answer there.

So WhatsApp is no longer "the first line's account" but "whichever line runs
it". `companyWhatsapp(settings)` in `phone-lines.tsx` returns the first line
that has one, and `whatsapp-float.tsx` asks it. Moving WhatsApp to a different
number is now a data change, not a code change.

- `apps/web/components/layout/phone-lines.tsx` — added `companyWhatsapp`
- `apps/web/components/layout/whatsapp-float.tsx` — uses it instead of `settings.whatsapp`
- `apps/api/prisma/seed.ts` — `whatsapp: ""`, pushed through `update` so an
  already-seeded database is corrected rather than left on the old number
- `apps/web/test/render.tsx` — fixture follows the seed
- `phone-lines.test.tsx`, `whatsapp-float.test.tsx` — the first line now carries
  no icon; the float opens `wa.me/8801818843999`

The schema has `whatsapp String` (not null), hence `""` rather than `NULL`.
Live row updated with `UPDATE "SiteSettings" SET whatsapp = ''`.

**Two client marks were withdrawn** at the client's instruction, with no trace
to remain. Removing the row alone is not enough — the ingested derivatives stay
served at their own URLs — so all four places were cleared:

1. `ClientLogo` rows, then the `Media` rows they pointed at
2. `apps/api/uploads/<storageKey>/` for each, the AVIF and WebP derivatives
3. `client_logos/*.webp` and their originals under `client_logos/_source/`
4. `seed-client-logos.ts`, so a re-seed does not bring them back

`sortOrder` was left with gaps by the delete (0, 3, 4) and renumbered to 0, 1, 2
so the database matches what a fresh seed would produce.

`client-logo-wall.test.tsx` had used real client names as fixtures. They are
invented now — `Alpha Ltd`, `Beta Group`, … — because a test that names real
clients breaks whenever permission changes, which is exactly what happened here.

**Consequence worth knowing:** three logos remain, and `MIN_FOR_MARQUEE` is 4.
The wall therefore stops scrolling and renders a plain centred row. That is the
existing deliberate behaviour, not a regression — a three-item loop reads as the
same marks going round rather than as a client list.

### Admin shell and enquiries — design agreed — 2026-09-14

Phase 1C-1 designed and specced:
`docs/superpowers/specs/2026-09-14-admin-shell-and-enquiries-design.md`.

Full content management was the scope asked for. It decomposes into three
phases, because the API turns out to be most of the way there already — eleven
content areas have guarded write routes, and only furniture and client logos
lack them:

1. **shell + enquiries** (this spec) — login, session, route protection, inbox,
   email on a new lead
2. **content editing** — projects, services, blog, hero, testimonials, team,
   certifications, settings, media and alt text, all on existing routes
3. **furniture and client logos** — needs API write routes first

Decisions: per-person accounts (email + password, as the API already does);
admin at `/admin`, outside the locale tree, English-only chrome with bilingual
content fields; browser talks to the API directly, matching the reasoning
already recorded in `main.ts` about per-IP throttling.

**Two security findings, both blocking a public deploy:**

1. `POST /api/auth/login` has no rate limit. `ThrottlerModule` is registered but
   never installed as `APP_GUARD`, so it only guards routes that name it — the
   public lead form alone. Login can be attempted as fast as the network allows.
2. The seeded admin defaults to `admin@homeinnbd.com` / `ChangeMeNow!2026`,
   written in `seed.ts` and pushed to GitHub. Deploying without setting
   `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` publishes the admin password.
   The upsert is `update: {}`, so setting them after the account exists does
   nothing silently — changing it needs a deliberate script.

### The domain changed — `homeinn-interior.com` — 2026-09-14

Supersedes the two entries above about `homeinnbd.com`. The site will be at
**`homeinn-interior.com`**, which is **not registered yet** — checked by RDAP,
`404` from Verisign, so it is free to buy.

`homeinnbd.com` is still owned and still parked at `127.0.0.1`. It is not being
abandoned as a registration, but it is no longer the address the site will
answer on.

Worth knowing before the purchase: **`homeinninterior.com`, the same name
without the hyphen, is already registered** and parked on GoDaddy nameservers.
Spoken aloud the two are identical, so a caller told the address will more often
than not type the unhyphenated one and land on a stranger's parked page. The
client's call; recorded so the trade-off was at least seen.

Consequences for work already done:

- `apps/web/lib/env.test.ts` used the old domain in its fixtures, updated. The
  assertions are about stripping trailing slashes, so the host is incidental.
- The admin design spec's same-site requirement now reads
  `homeinn-interior.com` + `api.homeinn-interior.com`.
- **The Google OAuth client** created in August has the old domain in its
  authorised origins and redirect URIs. Those entries are dead and will need
  replacing once the new domain is live. Google allows editing them at any time.
  Only the `localhost:3100` entries work in the meantime, which is all that
  local development needs.
- `seed.ts` still defaults the admin email to `admin@homeinnbd.com`. Left alone
  deliberately — it is a placeholder that must be overridden with a real address
  before deploying either way, and changing one dead default for another buys
  nothing.

Earlier plans and the Phase 1 design still name `homeinnbd.com`. They are a
record of what was decided when, and were not rewritten.

---

## Final touch-up — read-through and baseline — 2026-10-12

Read-only session: the whole repo (API, web, `packages/*`, seeds, specs, plan
outlines, git history) was read before the final touch-up starts. **No code
changed.** The only edit is this entry.

### Baseline

- `pnpm typecheck` — clean, 5 packages
- `pnpm test` — ui 5 · types 21 · api 55 · web 230 (311 passed)
- `pnpm lint` — clean
- API e2e **not run**: Postgres on 5433 was down. Expected to fail anyway —
  `seed.e2e-spec.ts` still asserts 7 services / 9 working areas, but the seed
  now has 6 (2D+3D merged) and 10 (`factory-works` added).

### Found while reading, for the touch-up list

1. `home.areasTitle` says "Nine kinds of project" (bn: "নয় ধরনের") — there are ten.
2. Visible section numerals run 01–05, 08, 09: Process (06) and Testimonials
   (07) hide but keep their numbers.
3. Home has no `<h1>` once the hero has images — only the zero-segment fallback
   renders one.
4. Bangla-digit phone numbers are rejected. The bn hint itself shows
   `০১৭৬০৭৭৫৪৫৪`, and `bdPhone` only strips separators and `+880`.
5. `sitemap.ts` omits `/furniture` and the product pages.
6. Lead form messages fail AA: `text-brand` at 14px (4.07–4.32:1) and
   `text-walnut` on ink (~3:1) for success. axe never sees them — they only
   appear after a submit.
7. `accent-[--color-brand]` is Tailwind v3 syntax; the build emits
   `accent-color:--color-brand`, which is invalid, so the furniture checkbox
   is unstyled.
8. Project detail eyebrow link and rich-text links use `text-brand` at small
   size — same AA problem; detail routes are outside the axe sweep.
9. Furniture detail: the lead-time `<dt>` has no `<dd>`, and the price sits
   under a "Made to order" label.
10. Project and gallery images have `altBn` = the English `seen` text; years
    and areas render in Latin digits on bn pages.
11. Furniture prices are invented placeholders and the six products are
    `published: true` — must be real or `null` before deploy.
12. `ASSET-CHECKLIST.md` is stale (hero and project slots are now filled).
13. The furniture work (`d449d65`, `5cec3c6`, `5e1810d`) has no entry in this
    file.
14. Still open from before: login throttle and seeded admin password (both
    block deploy), 25 projects with provisional titles published locally,
    the profile-PDF content, the hero-video decision.

Line 43 of this file read `suitesshun` — a stray keystroke from the editor,
left as found then, and corrected when the brand refresh was committed.

---

## Brand refresh, Part 1 — logo, font, palette, hero — 2026-10-12 — DONE (uncommitted)

Muhammad brought a new identity: a "Home inn" wordmark set in **Righteous**
(`assets/` — a dark cover and a cream square profile mark), with the request to
put it on the site, change the font, take the theme from the logo, and replace
the hero photographs with good free-licence ones. Home Inn now does
architecture as well as interiors; that remodel is **Part 2**, after this.

Decisions, agreed in chat:

- Righteous on the logo and headings only. Body, forms and tables stay in
  Geist — Righteous has one weight and is a display face. Bangla stays on Anek
  Bangla, because Righteous has no Bangla glyphs.
- The palette comes from the logo, and the red accent goes.
- The name is **"Home Inn"** everywhere. "Interior Solution" is dropped.

### 1. The name — DONE

| File | Change |
| --- | --- |
| `apps/web/messages/{en,bn}.json` | brand, statement, story, default title and title template: "Home Inn" / "হোম ইন" |
| `apps/web/lib/seo.ts` | `BRAND` constant, used for the OG site name, the LocalBusiness/Organization name, and the Article author |
| `apps/api/prisma/seed-data/services.ts` | six service bodies, both languages |
| `apps/web/app/not-found.tsx` | root 404 link text |
| `apps/web/messages/messages.test.ts` | **new test**: neither catalogue may contain "Interior Solution" / "ইন্টেরিয়র সলিউশন" |
| `apps/web/lib/seo.test.ts` | asserts the JSON-LD name is "Home Inn" |

Both tests failed first (10 stale catalogue keys; old JSON-LD name), then passed.
Web suite: 231 passed.

### 2. The palette — DONE

The palette now comes from the logo: charcoal `#14181A`, cream `#F3EDE2`,
amber `#F0A63A`, and burnt orange as `brand`. The red `#E01B24` is gone.

**There are two accents, picked by the ground.** Burnt orange is 3.24:1 on
charcoal and amber is 1.76:1 on cream, so neither colour works on both
grounds. A new `--color-accent` token defaults to `brand`. A `.ground-ink` class
switches it to amber for everything inside. Components write `text-accent` /
`hover:text-accent` and never need to know which ground they sit on.
`ground-ink` is on the header, the mobile menu, the footer, ink `Section`s, all
three hero variants, and the error and 404 pages.

**`brand` is `#AE4B0B`, not the logo's `#B9500C`.** The logo's colour is
4.28:1 on cream, which fails AA for small text. `#AE4B0B` is 4.73:1 and looks
the same at a glance. White on it is 5.51:1, so the solid button keeps white
text.

This also closes findings 6–8 from the read-through:

- Lead-form errors now use the accent: 4.73:1 on bone, 8.70:1 on ink. Success
  uses the surrounding text colour; the walnut success line was ~3:1 on ink.
- The project-detail eyebrow and rich-text links now pass AA.
- The furniture checkbox uses `accent-brand`. The v3-style
  `accent-[--color-brand]` had compiled to invalid CSS.

| File | Change |
| --- | --- |
| `apps/web/app/globals.css` | new palette, `--color-accent`, `.ground-ink`; numerals and focus ring use the accent |
| `apps/web/app/theme.test.ts` | pins the new values, asserts no `#E01B24`, asserts the accent switch |
| `components/sections/section.tsx` (+ new `section.test.tsx`) | ink tone adds `ground-ink` |
| `components/layout/site-header.tsx`, `site-footer.tsx` (+ tests) | `ground-ink`; hovers use the accent |
| `components/layout/new-flag.tsx` | amber chip with ink text (8.70:1) |
| `components/hero/{panorama-hero,hero-stack}.tsx` | `ground-ink`; progress bar uses the accent |
| `components/forms/lead-form.tsx` (+ 2 tests) | status colours as above |
| 15 other files under `app/`, `components/`, `packages/ui` | `hover:text-brand` → `hover:text-accent`, `outline-brand` → `outline-accent`, `[&_a]:text-brand` → `[&_a]:text-accent` |
| `app/not-found.tsx` | inline colours updated to the new palette |

13 new or changed tests failed first, then passed. Web suite: 239 passed.

### 3. Righteous and the wordmark — DONE

| File | Change |
| --- | --- |
| `apps/web/lib/fonts.ts` | Righteous (400, Latin) replaces Fraunces, which is no longer loaded at all |
| `apps/web/app/globals.css` | `--font-display: var(--font-righteous), var(--font-anek), …`; `.heading` weight 400 (Righteous has one weight, and 500 invited a synthetic bold) |
| `apps/web/components/brand/wordmark.tsx` (+ test) | **new** — "Home inn" as live text: cream + amber on ink, charcoal + burnt orange on bone |
| `components/layout/site-header.tsx` | the wordmark is the home link; the long brand name is gone |
| `components/layout/site-footer.tsx` | the wordmark replaces the brand line |

**A Bangla fix came with this.** The old display stack was Fraunces → Georgia
→ Times, with no Bangla face in it at all. So every Bangla heading in
`.display-1`/`.display-2`/`.heading` rendered in whatever system font the
browser found. Anek now sits directly behind Righteous in the display stack.

### 4. Icons and the share card — DONE

| File | Change |
| --- | --- |
| `apps/web/app/icon.png`, `app/apple-icon.png` | **new** — the square cream profile mark, trimmed and re-padded; 512 and 180px. The site had no favicon before. Still legible at 32px |
| `apps/web/public/og.png` | **new** — the dark cover wordmark on a 1200×630 charcoal card |
| `apps/web/lib/seo.ts` (+ 2 tests) | a page with no image of its own now gets the brand card as its OG image instead of nothing |

### 5. The hero — DONE

The five archive photographs are out. Six free-licence Unsplash photographs
replace them, chosen for one warm palette of timber, cream and greenery, in
walking order: **Architecture** (a house at dusk) → Lounge → Living Room →
Kitchen → Bedroom → Workspace. That runs from architecture to workplace, which
is the company's range now. On phones the strip is Architecture, Living Room
and Workspace.

**They are stand-ins, and the files say so.** None is Home Inn's work.

- The labels name kinds of space, never projects.
- Each photograph's source, photographer and licence is recorded in
  `ASSET-CHECKLIST.md` and in the manifest itself.
- The Unsplash License allows commercial use without attribution; it is
  recorded anyway.
- Unsplash+ (premium) photos were filtered out when downloading — any whose
  download link did not redirect to `images.unsplash.com`.

**The seed is now manifest-driven.**
`apps/api/prisma/seed-data/hero/hero.ts` is the hero: file, both labels, both
alt texts, `focalX`, mobile flag, and source. `seed-hero.ts` makes the
database match it:

- A segment is kept only if its label **and** its file's byte length still
  match — ingest stores the source size in `Media.bytes`.
- Anything else is deleted, image row and derivatives included. Otherwise a
  retired photo would stay served at its own URL.
- New entries are ingested through the usual sharp pipeline.

The size check matters on the first run. The old strip already had "Living
Room", "Bedroom" and "Kitchen", and matching on label alone would have kept the
old pictures under the new labels. That case has a test.

The old seed also wrote the English label into `labelBn` as a placeholder. The
manifest schema now rejects a `labelBn` that equals `labelEn`. It also
requires a source and licence, unique labels, and at least one mobile segment.

| File | Change |
| --- | --- |
| `apps/api/src/content/hero-sync.ts` (+ spec, 10 tests) | **new** — `heroManifestSchema`, `planHeroSync` |
| `apps/api/prisma/seed-data/hero/hero.ts` + 6 JPEGs (2560px, ~0.4–0.75 MB each) | **new** — the manifest and the photographs |
| `apps/api/prisma/seed-hero.ts` | rewritten around the plan |
| `apps/api/prisma/seed-data/placeholders/` | **removed** — five archive JPEGs and the old README. The originals remain in `media_dump/` and in git history |
| `ASSET-CHECKLIST.md` | rewritten: current slots, and the licence record for all six |

Applied to the dev database: the first run removed 5 segments and added 6; a
second run kept all 6 and changed nothing. No orphaned hero media remains. The
main `pnpm seed` was re-run too, which renamed the six service bodies.

### 6. Found by looking at it, and fixed

Screenshots were taken with Playwright, driving the system Brave — no
Playwright browsers are installed on this machine. Four things turned up:

1. **The hero's "Scroll to walk through" cue was invisible.** It never had a
   colour of its own, so it inherited the body's charcoal and sat on the dark
   gradient. This predates today's work. The caption block is now `text-sand`
   (+ test).
2. **Righteous's ampersand reads as a "€"**: "Corporate Office € Bank
   Furniture". `lib/fonts.ts` now loads Fredoka 600's "&" alone — an 892-byte
   subset from Google Fonts, SIL OFL, at `apps/web/fonts/fredoka-ampersand.woff2`.
   It is limited with `unicode-range: U+0026` and sits first in the display
   stack. Fredoka was picked over Outfit, Lexend and Geist by rendering all four
   beside Righteous; its rounded terminals match (+ test).
3. **The new cream broke muted text.** `#F3EDE2` is a shade deeper than the old
   bone, so `text-ink/60` dropped from passing to 4.44:1. axe found 24
   violations across the site. Every `/60` text is now `/65` (5.21:1). A theme
   test now fails if `text-(ink|current)/(50|55|60)` reappears in `app/` or
   `components/`.
4. **The API e2e suite had been broken since 2026-08-08, for an environmental
   reason.** `homeinn_test` had only the `init` migration, so 27 tests failed
   with 500s. Ran `DATABASE_URL=$TEST_DATABASE_URL prisma migrate deploy` (three
   migrations applied). After that only the three stale seed counts from the
   read-through failed. `seed.e2e-spec.ts` now expects 6 services and 10
   working areas, with comments giving the dates and reasons.

### Verification

```
pnpm typecheck   → clean, 5 packages
pnpm test        → types 21 · ui 5 · api 65 · web 251
pnpm lint        → clean
apps/api e2e     → 87 passed, 3 todo (the profile-PDF rows), 6 suites
web build        → 97 pages, BUILD_ID present
axe (WCAG 2.1 AA, own script via Brave) → 0 violations on 11 routes
  (8 top-level + a project, a service and a product page)
  × en/bn × 1440px/393px = 44 pages
```

The repo's own Playwright e2e (`apps/web/e2e`) was **not** run — it needs
`npx playwright install`, which downloads browsers, and was not done without
asking.

### Running state left behind

- Postgres on 5433 is up.
- The API Muhammad started at 16:40 (`node dist/main.js`, :4000) was left
  running. It needed no restart: nothing it serves changed in code, and the
  hero is data.
- His `next start` on :3100 was stopped and replaced, because it was serving
  the old build. A new one runs from a background task on the same port, built
  with the LAN values from `.env` (192.168.0.167), so phone testing still works.

### Known and left

- On desktop, once the WhatsApp float appears it overlaps the right end of the
  hero cue on frames 2–6. The cue matters on the first frame, where the float
  is hidden.
- Copy still says "Interior design, custom furniture…" and "Nine kinds of
  project". The architecture positioning is **Part 2**, along with which of the
  renders in `/mnt/shinrinyoku/Home Inn/PDF References/` are Home Inn's own
  work.

---

## Cream theme, no amber, and a lights switch — 2026-10-12 — DONE (uncommitted)

Muhammad pointed at the cream profile logo — charcoal "Home", burnt-orange
"inn" — and said use that, not the yellow. Asked whether the header should be
cream or stay dark, he chose **both, as a dark-mode switch**, defaulting to
dark, with something other than the usual sun/moon icon.

### What changed

**The amber is gone, and orange does its job.** The palette now has:

- `logo` `#B9500C` — the mark's exact orange, used only for the wordmark's
  "inn", in both themes
- `brand` `#AE4B0B` — unchanged, small text on cream, 4.73:1
- `ember` `#D86A27` — new; the same orange lifted for small text on charcoal,
  5.11:1. It replaces amber as the dark-ground accent

The NEW flag is now `bg-brand text-white` (5.51:1), which reads the same on
either header. The hero's light pool uses `ember`. The share card
(`public/og.png`) is regenerated from the cream logo.

**Two themes.** The theme is set on `<html data-theme>`, and the server always
sends `dark`.

- **Dark** is the site as it was.
- **Light** swaps the colour tokens on every `.ground-ink` element:
  - `--color-ink` becomes paper `#F8F4EC`
  - `--color-sand` and `--color-bone` become charcoal
  - the accent becomes `brand`

  `bg-ink`, `text-sand`, `border-ink-line` and the rest compile to
  `var(--color-…)`, so the header, footer, mobile menu, dark sections and
  error pages all flip without a component knowing.
- **Two exceptions.** `.ground-photo` (the hero frames and the
  reduced-motion stack) stays dark, because its captions sit on a dark floor
  over the photo. `.ground-chrome` (the header) takes the logo's own cream
  `#F3EDE2`, so the light header reads exactly like the logo file.
- **Why paper, not bone.** Paper is a shade lighter than the cream `bone`
  sections, so the alternation between sections survives.

**The switch is a ceiling lamp** (`LampCeiling`): "Lights on" / "Lights off",
in Bangla "আলো জ্বালান" / "আলো নেভান". When the light theme is on, a small
ember glow sits under the shade. It has `aria-pressed`, and a `title`.

**How the choice sticks.** It is stored in `localStorage["hi-theme"]`. An
inline boot script in `<head>` applies it before paint, so there is no flash of
the dark page. `suppressHydrationWarning` sits on `<html>` for that one
attribute only.

| File | Change |
| --- | --- |
| `apps/web/app/globals.css` | palette (`ember`, `logo`; amber removed); light-theme flip rules |
| `apps/web/lib/theme.ts` (+ test) | **new** — `readTheme`, `THEME_KEY`, `DEFAULT_THEME`, `themeBootScript` |
| `apps/web/components/layout/theme-toggle.tsx` (+ test) | **new** — the lamp |
| `apps/web/app/[locale]/layout.tsx` | `data-theme="dark"`, boot script in `<head>` |
| `components/layout/site-header.tsx` (+ tests) | `ground-chrome`; the lamp beside the locale switch, on every screen size |
| `components/brand/wordmark.tsx` (+ test) | "inn" in `text-logo` everywhere |
| `components/hero/{panorama-hero,hero-stack}.tsx` (+ test) | `ground-photo`; light pool in ember |
| `components/layout/new-flag.tsx` | brand chip, white text |
| `messages/{en,bn}.json` | `nav.lightsOn` / `nav.lightsOff` |
| `app/theme.test.ts` | palette and light-theme rules pinned; asserts no amber |
| `apps/web/vitest.setup.ts` | Node 26's experimental global `localStorage` shadowed jsdom's and was `undefined`; the global now points at jsdom's real Storage |
| `public/og.png`, `ASSET-CHECKLIST.md` | cream share card |

### Verification

- `pnpm typecheck` / `pnpm lint` — clean. `pnpm test` — types 21 · ui 5 ·
  api 65 · web 271.
- Web build: 97 pages. The served HTML carries `data-theme="dark"` and the
  boot script.
- axe, WCAG 2.1 AA — **0 violations in both themes**: 11 routes × en/bn ×
  1440/393px × 2 themes = 88 pages.
- In Brave, clicking the lamp sets `light` and stores it; after a reload the
  page is still light, and the header computes to the cream. No console or
  hydration errors.
- Screenshots of both themes were checked by eye. The light header matches the
  logo file.

---

## Light by default, and the figures rewritten as prose — 2026-10-12 — DONE (uncommitted)

### The site opens light

Muhammad saw both themes and chose cream as the default. `DEFAULT_THEME` is now
`"light"`. The server sends `data-theme="light"`, and the boot script applies a
stored `"dark"` before paint. The lamp works the same way in reverse: it starts
"on", and turning it off gives the dark site. Tests: `lib/theme.test.ts`,
`theme-toggle.test.tsx`, `site-header.test.tsx`.

### "This looks AI-generated" — the big-number pattern, everywhere it was

His words, about the 73 / 57 / 13 row. He was right, and the same trope
appeared in four places:

| Where | Was | Now |
| --- | --- | --- |
| Home statement | three `display-1` numerals over small tracked labels, in a `<dl>` grid | one sentence: "So far: **73** corporate projects and **57** residential ones, across **13** districts of Bangladesh." (bn: "এ পর্যন্ত দেশের ১৩টি জেলায় ৭৩টি কর্পোরেট ও ৫৭টি আবাসিক প্রকল্প।"). The figures are set at the sentence's own size and picked out only by the accent colour |
| Track record | "73 + 57" in `display-2` | removed. The statement already says it, and the section keeps its body copy, flagship names (once they exist) and link |
| Every section header | numbered eyebrows "01 … 09" | eyebrow only. This also fixes the read-through finding that the visible run went 01–05 then 08, 09, because Process and Testimonials hide |
| Working areas list | "01 … 10" numerals | the area name, with a decorative `ArrowUpRight` that moves on hover |

`Section` lost its `numeral` prop. `TrackRecord` lost its `locale` and
`settings` props, which it no longer needs. The `home.stat*` message keys were
replaced by `home.statementFigures`, an ICU rich message with `<n>` tags.
`.section-numeral` remains for the 404 page only.

Tests: rewritten `statement.test.tsx` (no `<dl>`; the sentence; figures are
`<strong class="text-accent">` with no display class; Bangla numerals), and
new cases in `track-record`, `section` and `working-areas`. They failed first
(6), then passed. Web suite: 276. Typecheck and lint clean.

### Next, in the order Muhammad gave

1. Hero photos: the current six read as American houses; replace them with
   ones that feel like Bangladesh.
2. Commit and push, with no co-author trailer.
3. Start Part 2.

### The hero, second pass: photographs that look like Bangladesh — DONE

Muhammad: the first set "goes with American properties" — replace it with
things that fit Bangladesh. He was right: a Texas-style villa, Catskills
kitchens. The new six were chosen for what reads as a Bangladeshi home or
office:

| # | Label (en / bn) | Why it reads local | Photographer · place |
| --- | --- | --- | --- |
| 1 | Architecture / স্থাপত্য | duplex at dusk with a jali-patterned door screen, car porch, boundary wall with planting | Elite Prop · Madurai |
| 2 | Drawing Room / ড্রয়িং রুম | arched doorways, wooden armchairs with bolsters, ceiling fan, marble floor. "Drawing room" is what a Bangladeshi flat calls it | Sanju Pandita · — |
| 3 | Lounge / লাউঞ্জ | breeze-block jali wall with greenery — the material of contemporary Bangladeshi architecture, and of his Photo References | Jejo Jose · — |
| 4 | Kitchen / রান্নাঘর | U-shaped modular kitchen with a ceiling fan | SD Inc · New Delhi |
| 5 | Bedroom / শোবার ঘর | panelled wall, window with grill bars, laminate floor | Anisha Deb · Pune |
| 6 | Office / অফিস | workstations, glass partitions, cassette AC — Home Inn's own kind of corporate job | PYX Photography · New Delhi |

Mobile shows 1, 2 and 6.

Excluded on purpose: interiors with a Hindu shrine or idol (several of the
best Indian living and dining rooms had one), a watermarked render (Houzlook),
and Dhaka skyline shots — other people's buildings presented under
"Architecture" would be a claim.

**How they were found.** Unsplash's search pages sit behind a proof-of-work
bot check, which curl cannot pass. Driving Brave through Playwright passes it.
That made it possible to search properly (`?orientation=landscape&license=free`)
and to open each photo page. All six pages were checked on 2026-10-12: each
says "Free to use under the Unsplash License", and none is Unsplash+. Two pages
give no location, and the record says "—" rather than guessing India.

**Applying it.** `seed:hero` showed why the byte-size check exists. Four labels
were unchanged (Architecture, Lounge, Kitchen, Bedroom) but the files had
changed. All six old segments were removed with their media, and six were
ingested.

| File | Change |
| --- | --- |
| `apps/api/prisma/seed-data/hero/*.jpg` | the six new photographs; the six earlier ones deleted |
| `apps/api/prisma/seed-data/hero/hero.ts` | new manifest and header note |
| `ASSET-CHECKLIST.md` | licence record rewritten, with a "Taken in" column; notes the replaced first set |

Verified: the hero-sync spec passes (10), the API typecheck is clean, the dev
database has the 6 new segments, the web rebuild serves `data-theme="light"`,
and the screenshots were checked by eye.

### Committed and pushed — 2026-10-12

| Commit | What |
| --- | --- |
| `2c7b473` | feat(api): drive the hero from a manifest of licensed stand-ins |
| `61e9db2` | test(api): bring the seed e2e counts up to date |
| `4dccfb4` | feat(web): rebrand as Home Inn with the new wordmark, palette and lights switch |
| `ba88b0c` | docs: record the brand refresh, the themes and the second hero set |

There are no co-author trailers; Muhammad is the only collaborator (checked
with `git log | grep -ci co-authored` → 0).

Two first attempts went wrong and were fixed before anything was pushed:

- **A mis-staged commit.** A failed `git add` left the hero files staged, and
  they landed inside the e2e commit. It was undone with `git reset --soft
  HEAD~1` and redone as the two commits above.
- **The push itself.** HTTPS has no credentials on this machine, `gh` is not
  installed, and SSH (`~/.ssh/github-haifa`, which authenticates as
  Danial-Dirar) works. The push therefore went to
  `git@github.com:Danial-Dirar/homeinn-interior.git` directly, without changing
  the `origin` URL, and `origin/main` was refreshed with a fetch.

**GitHub was 13 commits behind before this.** Its main stopped at `a6041c0`
(2026-08-09, the lead-form fix). Everything from the client logo wall through
the admin design docs had never been pushed. The push was a fast-forward
(`a6041c0..ba88b0c`, 17 commits), checked with `merge-base --is-ancestor`
first. To make plain `git push` work next time, either set the remote to SSH
(`git remote set-url origin git@github.com:Danial-Dirar/homeinn-interior.git`)
or install `gh` — his call, not done here.

---

## Part 2 — Architecture remodel — 2026-10-12 — design notes (built: see "Part 2 — built" below)

Home Inn now does "everything starting from architecture design". The site
still introduces itself as interiors and furniture. Part 2 repositions it and
shows the architecture work. It is following the brainstorming path:
understand, ask, propose, spec, plan, build.

### What the company's own material contains

From `/mnt/shinrinyoku/Home Inn/PDF References/` (the `ignore/` folder was
left alone):

| Folder | What it is | Usable on the site? |
| --- | --- | --- |
| `Renders 2/` | one project: a modern two-storey villa with a brick jali facade. 20 renders at 1920×1080 — gate views ×4, aerials ×6, front elevation, interiors ×5 (stair, dining, living, bedroom), cutaway floor views ×4 | yes, if confirmed as Home Inn's work. 1920 wide clears both the hero and the project minimum |
| `16.09/` | a second project: a classical two-storey villa with a rooftop pool. Exteriors ×8, cutaways ×7, interiors ×3 at 1920×1080. Also `output_0*` (AI-enhanced, sea backdrops, 1024px), `80eeb4…~mv2.jpeg` (a Wix-hosted file, probably downloaded), and `Reference/` (other people's villas from Facebook) | the 1920 renders, if confirmed; not the AI outputs, the Wix file or `Reference/` |
| `Drawings/` | A3 PDFs — cover sheet, ground floor (A.02) and first floor (A.03) plans, 2,614 sq ft surface area, with garage, dining, living, beds and terraces | yes, as a floor-plan image. Which project it belongs to is unknown |
| `Variations/` | PromeAI variations (watermarked) and SketchUp "try" studies of a third, modern duplex, at 600–1300px | no — AI output, and too small |
| `Photo References/` | Pinterest-style inspiration (South Asian contemporary: terracotta, sage, jali, courtyards) | mood only; not ours to publish |

### Open questions

The first, asked on 2026-10-12: which of these folders are Home Inn's own
work. Nothing about them can be published until that is answered.

### Answers so far, and where Part 2 stands — 2026-10-12 (end of session)

Muhammad's answers:

- **Everything in `PDF References/` is Home Inn's own work and may be shown**,
  wherever it fits — the Variations included. Removing the PromeAI watermark is
  fine by him.
  - Still to be excluded: `16.09/Reference/` (other people's villas from
    Facebook, by the folder's own name).
  - The PromeAI free tier may require the watermark; worth confirming his plan
    before removing it.
- **Hero: leave it as it is.** He likes the current six photos and is not sure
  a render would look as good there. The renders go **elsewhere, probably
  Projects**.
- He would like **blueprints and design drawings scattered through the site**
  ("eidik odik"), **perhaps animated**. Later.
- Villa names, locations and years; which project the floor plan belongs to;
  and whether to build a "Plan → Model → Render" process section on the home
  page — all **deferred**: "save it all in the handout, ask me later".

### To do next session, in order

1. **Ask what was deferred**: the names, locations and years of the two
   villas (or agree descriptive titles); which project the floor-plan PDF
   (2,614 sq ft) belongs to; and the "Plan → Model → Render" section.
2. **Propose the Part 2 design and get it approved** (brainstorming → spec →
   plan):
   - positioning copy in en/bn — "architecture to interiors"; and fix the
     stale "Nine kinds of project", since there are now 10 working areas
   - an Architectural Design service, first in the list
   - an Architectural Design working area for design-stage projects
   - the brick-jali villa (`Renders 2/`) and the rooftop-pool villa (`16.09/`)
     as projects. Import them through a manifest seed, like the hero, with alt
     text saying "3D render", so a design is never presented as a built
     photograph
   - the Variations duplex, if it fits — watermark removed, though most
     Variations files are under 700px wide
   - blueprints / drawings placed around the site, possibly animated (for
     example a line-drawing reveal); PDF to image with `pdftoppm`
3. Then the read-through list that is still open: findings 4 (Bangla-digit
   phone input), 5 (`/furniture` missing from the sitemap), 9 (furniture
   detail `<dl>`), 10 (bn alt text and digits), 11 (furniture prices are
   placeholders), 12 (stale checklist rows), 14 (login throttle, seeded admin
   password, provisional project titles). Findings 1–3 and 6–8 were fixed
   today; 13 is answered by this file.

### Running state when the session ended

- The web server on :3100, started from this session, was **stopped**.
  Restart it with the LAN values:
  `set -a; . ./.env; set +a; PORT=3100 pnpm --filter @homeinn/web start`.
  The build in `apps/web/.next` is current.
- The API on :4000 and Postgres on 5433 were left as they were. Muhammad
  started both earlier.
- Everything is committed and pushed. GitHub `main` matches local.

---

## Part 2 — built — 2026-10-12

Muhammad answered the deferred questions: the villas get descriptive names,
with location, year and client left blank; the floor plan's owner is unknown,
so it stands on its own; and yes to a "Plan → Model → Render" section. He
approved the design and the spec. He then added: "lagle tui blog tab ta
shoraye oikhaneo architecture rakhte parish" — so the empty Blog tab gave its
place in the nav to Architecture.

- Spec: `docs/superpowers/specs/2026-10-12-architecture-remodel-design.md`
- Plan: `docs/superpowers/plans/2026-10-12-architecture-remodel.md` (seven
  tasks plus 6b)
- Built on branch `feat/architecture-remodel`, with each step tested first and
  then made to pass.

### Per task

| Task | Commit | Files | What |
| --- | --- | --- | --- |
| 1 | `67fdc50` | `messages/{en,bn}.json`, `messages.test.ts`, `panorama-hero.test.tsx` | Introduces the company as architecture, interiors and custom furniture: the statement, SEO title and description, the about story and the hero fallback. The stale "Nine kinds" and "Six ways" lines lost their counts, and a test now refuses any digit or number word in those titles, in either language. |
| 2 | `d534ce5` | `seed-data/services.ts`, `seed-data/working-areas.ts`, `lib/icons.ts`, `seed.e2e-spec.ts` | **Architectural Design / স্থাপত্য নকশা** is now the first service (icon `drafting-compass`) and the first working area. The others moved down one place. There are 7 services and 11 working areas. |
| 3 | `d570e70` | `src/content/architecture-manifest.ts` (+ spec), `prisma/seed-data/architecture.ts`, `prisma/seed-architecture.ts`, `package.json`, `.gitignore` | `pnpm seed:architecture` imports two projects. **Brick-Screen Villa / ইটের জালির ভিলা** and **Rooftop-Pool Villa / ছাদে পুলসহ ভিলা** each get a cover and 10 gallery renders, and both are published and featured. A zod schema refuses any alt text that does not begin "3D render:" / "৩ডি রেন্ডার:", and the seed refuses to run if a file is missing. It matches projects by slug, so a second run changes nothing. It also sets the service cover from the brick villa's front view. |
| 4 | `a9f5548` | `components/blueprint/blueprint.tsx` (+ test), `public/blueprints/{ground,first}-floor.webp` | `<Blueprint plan>` draws the A.02/A.03 floor plans. The line art is used as a CSS mask over `currentColor`, so the lines follow the theme. On scroll, a `clip-path` wipe draws the plan left to right, with an accent "pen" edge. Under reduced motion it appears complete and still. Decorative copies are `aria-hidden`; labelled ones are `role="img"`. |
| 5 | `e11acfa` | `components/sections/process.tsx` (+ test), `public/process/*.webp`, catalogues | The home Process section, which used to render nothing, now shows three panels. **Plan:** the ground floor drawing itself in. **Model:** the SketchUp study of the duplex (`Variations/try 4.JPG`). **Render:** the duplex render (`Variations/2 (7).JPG`). The captions do not claim the plan belongs to the same house. |
| 6 | `607445a` | `statement.tsx`, `services/[slug]/page.tsx`, `projects/[slug]/page.tsx`, `blueprint.tsx` | Adds the first-floor plan, faint (7%), behind the statement on large screens, and the ground-floor plan on the Architectural Design service page. Project pages no longer show an empty facts box when a project has no location, year or client, which is the case for both villas. |
| 6b | `0d53a38` | `site-header.tsx`, `site-footer.tsx` (+ tests), `services/[slug]/page.tsx`, catalogues | The nav now reads Home · **Architecture** · Services · Projects · Furniture · Clients · About · Contact, and the footer follows the same order. **Architecture** links to `/services/architectural-design`, which now lists the two designs below the plan. The Blog route still exists; only the nav link is gone. |
| 7 | `c0f0723` | `hooks/use-reveal.ts`, `blueprint.test.tsx`, both blueprint webps | Two things found during verification, below. |

### Found during verification, and fixed

- **Every scroll reveal on the site was firing on page load.** `useReveal`
  trusted the first value from `usePrefersReducedMotion`. That value is
  `true` until the preference has been read, so every entrance had already
  finished before anyone scrolled to it. This affected the blueprint wipe,
  the furniture cards and the custom-built panel. The effect now reads the
  media query directly. A test was added first and seen to fail ("waits
  until it is in view before drawing"). A browser check then confirmed the
  plan stays fully clipped at load and draws when scrolled into view,
  finishing in about 2.6s.
- **Plan lines too thin.** At panel size the 1px CAD lines faded into the
  dark ground. Both masks were rebuilt with
  `-morphology Dilate Disk:1`.

### Assets, and how they were made

- **Floor plans:**
  1. `pdftoppm` rendered the A.02/A.03 PDFs from `Drawings/` to PNG.
  2. ImageMagick turned the PNG into alpha line art: white → transparent,
     lines → opaque, then dilated by 1px and trimmed.
  3. The result was saved as WebP at 1600 px wide: ground 154 KB, first
     123 KB.
- **The PromeAI watermark was cropped off, not painted over.** `2 (7).JPG`
  is 5504×3640, and the watermark sits in the bottom band. It was cropped to
  `5504x3240+0+0`, then saved as WebP at 1600 and 960 wide (64 KB / 29 KB).
- **Model:** `try 4.JPG` (1306×871), saved as WebP at 1280 and 640 wide.
- **Correction:** the floor plan's surface area reads **2,814.19 sq ft**. The
  design notes above say 2,614 sq ft; that was a misreading.
- **Not published:** `16.09/Reference/` (other people's villas), the AI
  `output_0*` files, and the Wix file.

### The renders live outside git — copy them before seeding

`architecture_renders/` is gitignored, the same as `media_dump/`, so the
22 renders (about 40 MB) stay out of the repository. On a new machine or
server, copy them in first, from the repo root:

```bash
R="/mnt/shinrinyoku/Home Inn/PDF References"; A=architecture_renders
mkdir -p $A/brick-screen-villa $A/rooftop-pool-villa
b() { cp "$R/Renders 2/$1" "$A/brick-screen-villa/$2"; }; p() { cp "$R/16.09/$1" "$A/rooftop-pool-villa/$2"; }
b "2.jpg" front.jpg; b "1_16 - Photo.jpg" gate.jpg; b "1_18 - Photo.jpg" street-corner.jpg
b "2_1 - Photo.jpg" aerial-roof-terrace.jpg; b "2_6 - Photo.jpg" aerial-entrance.jpg; b "13.jpg" stair-hall.jpg
b "14.jpg" dining.jpg; b "15.jpg" living-room.jpg; b "16.jpg" bedroom.jpg; b "4.jpg" cutaway-ground.jpg; b "6.jpg" cutaway-upper.jpg
p "1_7 - Photo.jpg" front.jpg; p "1_5 - Photo.jpg" garden-approach.jpg; p "1_1 - Photo.jpg" aerial-pool.jpg
p "1_3 - Photo.jpg" aerial-roof.jpg; p "1_6 - Photo.jpg" aerial-porch.jpg; p "8.jpg" pool-deck.jpg; p "11.jpg" living-room.jpg
p "9.jpg" dining-hall.jpg; p "12.jpg" stair.jpg; p "3.jpg" plan-view.jpg; p "4.jpg" cutaway-ground.jpg
```

Then run `cd apps/api && pnpm seed && pnpm seed:architecture`. On the dev
database, the first run added both villas (a cover and 10 renders each) and
set the service cover. The second run reported "kept" for both and added
nothing.

### Verification

- **Suites:** typecheck 5/5; unit tests: web 291, api 74, types 21, ui 5;
  lint clean; api e2e 88 passed (3 todo).
- **axe (WCAG 2.1 AA, Brave via Playwright):** 0 violations, in both
  locales, both themes, and at desktop and mobile width.
  - The targeted pass covered 72 pages: home, services, the architecture
    service page, projects, the brick villa and the architecture filter.
  - Full-site sweeps found 0 in light and 0 in dark.
- **Every route returns 200.**
- **Screenshots, checked by eye:**
  - The process section in both themes: the plan draws in and its lines are
    visible.
  - The statement backdrop sits faint, behind the text.
  - The Architecture page shows the cover, the plan and both designs.
  - The villa pages have no empty facts box.
  - The projects filter lists Architectural Design first.
  - The nav reads Home · Architecture · ….

### Rulings made along the way (from the build ledger)

- Built on a branch in place rather than a worktree. The app depends on
  gitignored local state (`.env`, uploads, `media_dump/`,
  `architecture_renders/`) that a fresh worktree would not have.
- Added Task 6b (the nav change), on Muhammad's invitation. The spec's "nav
  not changed" was written before he made it.
- The English areas title "one standard of finish" tripped the count guard
  on "one". It became "finished to the same standard"; the guard was left
  as strict as it was.
- Wrapped the process images in `<picture>`, the same way
  `components/media/picture.tsx` avoids the `no-img-element` lint rule.
- `Blueprint` merges its classes with `cn()`, so a caller's `absolute`
  replaces the default `relative` instead of fighting it.
- The thicker plan lines and the reveal fix, both above.

### Branch review, and what it changed

A fresh reviewer (Opus) read the whole branch, `c3383dd..e7689f6`. Its verdict
was "with fixes". It confirmed all five risks the plan had flagged:

- reduced motion
- theme colours
- the missing-renders refusal
- Bangla captions
- the empty facts box

It found four more problems, all fixed in `5f4fdb9`. Each fix began with a test
that failed:

| Finding | Fix | Checked in the browser |
| --- | --- | --- |
| **Critical:** the reveal fix made 4 of 6 furniture cards unreachable by keyboard. The cards waited behind `visibility: hidden`, which never mattered while reveals fired on mount. Tab went from card 2 straight to the footer. | The cards and the custom-built panel now wait transparent instead of hidden. Keyboard focus counts as arriving (`focusin`). | Tab reaches 6 of 6 cards at 1280 and 393 wide |
| The villas sat in "Recent work" beside photographs of built offices, with nothing visible to say they are renders. | The project list now includes each project's working-area slug. Design-stage cards show a **3D render / ৩ডি রেন্ডার** tag on the picture, in the same style as "Made to order". | Tag on both villas on the home page, `/projects` and the Architecture page, in en and bn; built work has none |
| The statement's backdrop plan made the page scroll sideways at 1024–1300px. | `-right-10` → `right-0` | `scrollWidth` matches the window at 1024, 1280, 1300 and 1440, en and bn |
| The Model caption said "the plan built up in 3D", which joins two different houses into one project. | It now reads "A design built up in 3D…" / "নকশাকে ৩ডি-তে গড়ে তোলা…". | — |

After the fixes:

- **Tests:** typecheck 5/5; unit tests web 300, api 74, types 21, ui 5;
  lint clean; api e2e 89 passed (3 todo).
- **axe:** 0 violations in the full sweep in light and in dark.

**Deferred, small** (noted, not fixed):

- **No share description on villa pages.** They have no meta or OG
  description; it falls back to the location, which is empty. A shared link
  says nothing about renders.
- **Project order isn't fixed.** The public list has no final tiebreak. On a
  database with other featured projects at sortOrder 0 or 1, the villas may
  not lead, or may swap places.
- **`seed:architecture` has two gaps.**
  - It runs without a transaction, so a failure partway through leaves orphan
    media.
  - It refuses to run on a server where the renders were deleted after
    seeding.
- **The Bangla count guard has gaps.** It misses দুটি, ছ'টি and the
  precomposed য়.
- **Stale comments:**
  - "nine" in `working-areas.ts`
  - "seven" in `icons.test.ts`
  - the body comment in `services.ts`
  - the `[reduced]` dependency in `use-reveal.ts`
- **The footer menu repeats the header's route list** instead of deriving
  from it.
- **Untested:** the hidden empty facts row, and the seed's
  refuse-before-write order and "kept" path.

**For Muhammad to decide:**

- **Overlapping services.** The new Architectural Design service overlaps the
  existing "2D & 3D Plan, Model & Visualization".
- **The Blog route.** `/blog` still works and is still in the sitemap; only
  its nav link is gone.

### Deploying this

1. **Copy the renders in**, using the block above.
2. **Rebuild and restart the API.** The project list's new `workingArea`
   field comes from the API. Until it restarts, cards render without the
   3D-render tag; they do not break.
3. **Run `pnpm seed`, then `pnpm seed:architecture`.** Run these before the
   web build or revalidation. Until the seed has created the Architectural
   Design service, the nav's Architecture link returns 404.
   - Note: `pnpm seed` overwrites admin edits to services and working areas.
     That has always been true, and this branch adds two rows to it.
4. **Build and start the web app.**

### Running state

- **API on :4000** runs in Muhammad's own terminal from the old build. Its
  `dist/` has been rebuilt, so **a restart there** (Ctrl-C, then
  `pnpm --filter @homeinn/api start`) brings in the render tags.
- **Web on :3100** was rebuilt with the LAN `.env` and restarted from this
  session.
- **The second API on :4100**, used only for the browser checks, was stopped.

---

## A see-through header over the hero — 2026-10-13 — DONE

Muhammad, pointing at the top bar on the home page: "eita transparent kore de
ektu". The bar over the hero was an 80% scrim with a small blur. It is now:

- **Light theme:** 55% cream with a 12px blur. Charcoal text on 55% cream
  still clears 4.5:1 even over a black pixel of the photo.
- **Dark theme:** 75% ink, also with a 12px blur. Cream text needs 75% to
  clear 4.5:1 over a white pixel, so it can't go as thin as the light bar.
- **Once scrolled**, or on any page other than home, the bar is unchanged:
  95%.

What changed:

- `components/layout/site-header.tsx`: the light-theme value comes from the
  variant `[[data-theme=light]_&]:bg-ink/55`, which outranks the 75% base.
- `site-header.test.tsx`: new test "lets the hero show through, more on the
  cream than on ink", which failed first and then passed.

Checks:

- Tests: web 301, typecheck and lint clean.
- Rebuilt and restarted :3100. In the browser, the computed backgrounds were
  `/ 0.55` in light and `/ 0.75` in dark, both `blur(12px)`.
- Screenshots in both themes checked by eye.
- axe on the home page found 0 violations in light and 0 in dark.

### Next session

**Build the admin panel.** Muhammad: "kalke shokale limit ashle amra admin
panel build kora start korbo". The admin design was agreed on 2026-09-14
(see "Admin shell and enquiries — design agreed" above). Before starting:

- Restart the API on :4000 so the render tags appear. Its build is already
  current.
- Two answers are still owed from Part 2: whether to merge the two
  overlapping services, and whether `/blog` should be removed entirely.

---

## Admin panel at `/admins` — 2026-10-13 — DONE (built overnight; merged to main)

Muhammad, before going offline: build an admin panel where the Contact Us
messages can be read, "and not only that, everything else too". It goes at
`domain/admins`. The site stays as it is, with a few animations where they
help, and anything left over gets polished. **Don't ask anything.**

- **Spec:** `docs/superpowers/specs/2026-10-13-admin-panel-design.md`. It
  builds all three phases of the 2026-09-14 admin spec together. Its rulings
  are listed at the end of the spec.
- **Branch:** `feat/admin-panel`.

### Log
- **API: accounts, inbox, media** (`feat(api): throttle login…`):
  - **Accounts:**
    - **Login throttle:** 10 attempts per 15 minutes per IP, with
      `LOGIN_THROTTLE_LIMIT` to override.
    - **`trust proxy`** is set to `TRUST_PROXY ?? "loopback"` in `main.ts`.
    - **Changing your own password:** `POST /auth/password`.
    - **Account management:** `/users` lets an admin list, create, edit and
      delete accounts. Deleting yourself, or deleting or demoting the last
      admin, is refused.
  - **Leads:**
    - The list takes a `?status=` filter and includes the service.
    - New routes: `GET /leads/:id`, and `DELETE /leads/:id` for admins only.
    - **Email on a new lead** (`src/leads/lead-notifier.ts`, with nodemailer)
      is off until `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and
      `LEAD_NOTIFY_TO` are set. It is never awaited.
  - **Media:** `PATCH /media/:id` corrects alt text, and `GET /media?q=`
    searches it.
  - **Shared types:** `changePasswordSchema`, `createUserSchema`,
    `updateUserSchema`, `leadListQuerySchema` and `mediaListQuerySchema`.
  - **Tests:**
    - `test/auth-throttle.e2e-spec.ts`: the eleventh login gets a 429.
    - `test/accounts.e2e-spec.ts`: 12 tests.
    - `test/inbox.e2e-spec.ts`: 10 tests.
    - `src/leads/*.spec.ts`: 4 tests, including "still saves the enquiry
      when the email cannot be sent".
    - The e2e environment sets `LOGIN_THROTTLE_LIMIT=10000`, since every file
      logs in many times.
- **Security review → fixed** (`fix(api): end sessions at once…`). A
  background review of the accounts commit found two problems:
  - When an admin reset someone's password or changed their role, that
    person's sessions kept running.
  - A deleted account's access token worked until it expired.

  The fix:
  - `AdminUser` gained `sessionsValidAfter`. Migration:
    `20261012210916_admin_sessions_valid_after`, applied to the dev and test
    databases.
  - Resetting a password, changing a role or changing your own password sets
    it and revokes the refresh tokens.
  - `JwtGuard` now reads the account on every request. It refuses tokens
    issued before the cut-off and accounts that no longer exist, and takes the
    role from the database. To compare to the millisecond, access tokens carry
    `iatMs`.
  - Three tests were written first and seen to fail.
- **API: content writes and the admin read surface**
  (`feat(api): write routes for furniture…`):
  - **Write routes:** `/products`, `/client-logos`, `/clients/corporate` and
    `/clients/residential`.
  - **Clearable fields:** optional values can be cleared with `null`.
    Settings links take `""`.
  - **Project location** may be empty.
  - **Admin reads:** `GET /api/admin/summary`, `/api/admin/:resource` and
    `/:resource/:id`. These live in `src/admin/` and are driven by one
    registry of twelve resources.
  - **Tests:** `test/content-admin.e2e-spec.ts`, 17 tests.
- **Instant updates** (`feat: refresh the site the moment…`):
  - **API:** `src/revalidate/revalidate.ts` is a global interceptor. It maps
    each write route to cache tags and posts them to the web app.
  - **Web:** `app/api/revalidate/route.ts` takes the request. It accepts only
    known tags and compares the secret in constant time.
  - **Configuration:** set `REVALIDATE_SECRET` on both apps and
    `WEB_REVALIDATE_URL` on the API.
- **`pnpm admin:password <email>`** (`apps/api/scripts/admin-password.ts`):
  - Reads the new password from `ADMIN_NEW_PASSWORD`.
  - `--create "Name"` makes a new admin.
  - It ends that account's sessions.
- **Web: the panel's foundations** (`feat(web): the admin panel's
  foundations…`):
  - `lib/admin/api.ts` sends every panel request with cookies. On a 401 it
    refreshes once and retries, and requests that fail together share that
    one refresh. When the refresh also fails, it goes to
    `/admins/login?next=…`, and `next` may only point inside `/admins`.
  - `lib/admin/fields.ts` and `payload.ts` are the field engine. It converts
    between a saved row, the form state and what the API expects:
    - bilingual pairs
    - images as ids, galleries as lists of ids
    - prices in taka on screen, poisha in the database
    - empty optional fields as `null`
  - `lib/admin/resources.ts` describes the twelve content types and the
    settings form. A test checks the list against the API's.
  - The middleware leaves `/admins` alone. `/admin` redirects with a 308.
    `robots.txt` disallows both.
  - Tiptap was added for the text editor.
- **Web: the panel** (`feat(web): the admin panel at /admins`). The pages:
  - **Sign-in:** `app/admins/login`.
  - **The frame:** `components/admin/admin-shell.tsx` shows nothing until
    `/auth/me` answers. The sidebar is grouped Inbox / Work / Home page /
    Company / Journal / Library / Site, with a count of new enquiries. On a
    phone it becomes a sheet.
  - **Overview:** the waiting enquiries are given in a sentence, not as a
    stat tile. It also lists the latest five, the drafts and a link into
    every area.
  - **Inbox:** status tabs, opening on New.
  - **Enquiry page:** call, WhatsApp and email links, status, internal notes,
    and delete (admins only).
  - **The editor:** `resource-form.tsx` generates the editor for all twelve
    content types. It has an image picker that can upload (alt text required
    in both languages) and an editor that offers only what the site's
    sanitiser keeps.
  - **Media library:** upload, alt text, delete. An image still in use says
    so.
  - **Settings:** editors can read them; only admins can change them.
  - **Accounts and your own password.**

  Every page is `noindex`. In the editor, gallery images can be added and
  removed but not reordered: the implicit join table keeps no order, so
  offering reordering would promise something the site cannot keep.
- **Security review → fixed** (`fix: keep admin requests on their own
  route…` and `fix: the browser now reaches the real API…`). The review found
  three problems:
  1. **Crafted ids.** Ids from the address bar went into API paths
     unencoded. A link to `/admins/enquiries/..%2Fusers%2F<id>` would have
     made "Delete enquiry" delete an account. Every id is now
     `encodeURIComponent`-ed.
  2. **Untrusted links.** `sourcePath`, which comes from the anonymous form,
     was rendered as a link. A `javascript:` value would have run when
     clicked.
  3. **Tab and newline tricks.** The first fix for (2) could be fooled by
     tabs or newlines, which browsers strip, so `"/<tab>/evil"` becomes
     `//evil`.

  For (2) and (3), `isSitePath()` in `@homeinn/types` now refuses
  whitespace, control characters and backslashes, then asks the URL parser
  itself. The API's lead schema and the inbox both use it.
- **Found in the browser check: the live site's contact form would never
  have reached the API.** This bug predates tonight:
  - `apiBaseUrl()` read `process.env` through a variable. Next only inlines
    the literal `process.env.NEXT_PUBLIC_…`, so in the browser the value was
    always the fallback, `http://localhost:4000/api`.
  - On the live site, every visitor's lead form would have posted to their
    own computer. It went unnoticed because every test browser ran on the
    machine that also runs the API.
  - Fixed by writing out `process.env.NEXT_PUBLIC_API_URL` and `_SITE_URL`
    literally, with a guard test. The browser bundle now contains the
    configured address (checked).
- **Verification**, against a fresh API on :4100 and the web app on :3100,
  with revalidation switched on:
  - **Tests:**
    - typecheck 5/5
    - unit tests: web 368, api 88, types 22, ui 5
    - lint clean
    - API e2e 135 passed (3 todo)
  - **Brave walkthrough** (`scratchpad/admin-walk.cjs`):
    - signed out → login, remembering the page
    - a wrong password gets a plain message
    - sign in → back to the page
    - a test enquiry: status saved, then deleted
    - a project's title edited: **the public page showed the change at once**
      (revalidation works); the title was then put back
    - an image uploaded, then deleted
    - settings, accounts, your password, new furniture, hero
  - **axe:** 0 violations on every page. The one exception was the phone
    header wordmark at 3.58:1, now fixed by setting it at 24px.
  - **Test data:** a temporary admin, `qa-overnight@homeinn.local`, was
    created for the check and is removed at the end. The test enquiries were
    deleted. The two "Playwright" enquiries from 9 Aug were already in the
    dev database and were left alone.
- **Entrances on the public site** (`feat(web): quiet entrances…`). Muhammad
  liked the blueprint drawing itself, so `components/motion/reveal.tsx`
  adds a few entrances in the same spirit:
  - section headings rise in
  - services and working areas arrive one after another across a row
  - project pictures unveil from the bottom up, staggered along the row
  - in the process section, the model and then the render unveil after the
    plan starts drawing

  The hero is untouched. Content that is waiting is transparent or clipped,
  never removed from the accessibility tree, and keyboard focus finishes the
  entrance at once. Everything shows at once, without animation, under
  reduced motion and in a browser without IntersectionObserver or
  matchMedia. A `<noscript>` style shows it without JavaScript.

  Checked in Brave:
  - nothing is left hidden after scrolling to the bottom
  - reduced motion: nothing waits
  - JavaScript off: nothing hidden
  - axe on the full public site: 0 violations in light, 0 in dark
- **Leftovers polished** (`fix: small things left over…`):
  - `sitemap.xml` now lists `/furniture` and every published piece.
  - A villa page with no location now uses the opening of its description
    as its share description.
  - The lead form accepts a phone number typed in Bangla digits.
  - Projects with the same featured flag and order now list by title, so
    they no longer swap places between requests.
- **Whole-branch review → fixed** (`fix: act on the branch review…` and
  `fix(api): quote a visitor's message…`). A fresh Opus reviewer found
  nothing critical. Auth, sessions, CSRF, XSS and revalidation all held up.
  - **Two Important problems**, both of which would have blocked the panel's
    first real jobs:
    1. **Imported projects and furniture could not be saved.** Their
       descriptions are empty on purpose, but a description was required.
       Descriptions may now be empty.
    2. **Settings could not be saved.** The seeded first-line WhatsApp is
       empty on purpose, but it was required. It may now be empty.

    Both were checked in the browser: an imported photo project, a furniture
    piece and the settings all save.
  - **Smaller problems:**
    - **Blog dates** show the Dhaka day, and saving never moves a post. A
      newly chosen day starts at midnight in Dhaka.
    - **Prices** are capped at what the INT4 column holds, so an oversized
      price gets a 400 instead of a 500.
    - **Validation problems inside a list** are shown on the list's field.
    - **Refreshes are serialised across tabs** with Web Locks. Without this,
      two tabs could send the same refresh token and end every session.
    - **An unreachable API** now gets "can't reach the server" with a Try
      again button, instead of a spinner that never ends.
    - **`TRUST_PROXY`** now accepts numbers and booleans.
    - **Links in every write schema** must be http(s).
    - **The Published badge** updates after a save.
    - **The image picker** restarts at page one each time it opens.
  - **Enquiry emails:** the reviewer, then an automatic commit review, found
    that a visitor could make lines in the email that pass for ours. The
    name is now one line, the real admin link comes first, and every line of
    the message is quoted with "> ". It splits on every separator a mail
    client may break lines on: \r, \v, \f, NEL, U+2028 and U+2029.
  - **Final suites:** typecheck 5/5; unit tests web 394, api 95, types 29,
    ui 5; lint clean; API e2e 138 passed (3 todo).
- **Clean-up:** the temporary QA admin is deleted. No QA enquiries are left.
  The dev database's only account is `admin@homeinnbd.com` (ADMIN).

### Going live: what the two apps need

Set these on the Mac, in the environment of each process.

**Web — `NEXT_PUBLIC_*` are fixed at build time**, so they must be set when
running `next build`, not only at start:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.homeinn-interior.com/api` |
| `NEXT_PUBLIC_SITE_URL` | `https://homeinn-interior.com` |
| `REVALIDATE_SECRET` | a long random string, the same as the API's |

**API:**

| Variable | Value / note |
| --- | --- |
| `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `UPLOAD_DIR`, `PUBLIC_MEDIA_BASE_URL` | as now, with production values |
| `WEB_ORIGIN` | `https://homeinn-interior.com` (CORS allowlist; comma-separated) |
| `NODE_ENV` | `production`, so the cookies are `Secure` |
| `REVALIDATE_SECRET` | the same as the web's |
| `WEB_REVALIDATE_URL` | `http://localhost:3000/api/revalidate` (the web app on the same Mac) |
| `TRUST_PROXY` | leave unset: the default `loopback` suits a tunnel on the same machine |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `LEAD_NOTIFY_TO` | enquiry emails: `smtp.gmail.com`, `465`, the Gmail address, a Gmail **app password**, and who receives them |

**Before the site is reachable:**

1. **The admin password.** The default `ChangeMeNow!2026` is on GitHub.
   Change it with:

   ```
   ADMIN_NEW_PASSWORD='…' pnpm --filter @homeinn/api admin:password admin@homeinnbd.com
   ```

   Or change it from the panel, under "Your password".
2. **Migrations:** `pnpm --filter @homeinn/api prisma:deploy`. This includes
   the new `admin_sessions_valid_after`.
3. **The site and the API must be the same site,** so the login cookies
   travel: `homeinn-interior.com` and `api.homeinn-interior.com` work. Two
   different `*.trycloudflare.com` hostnames do **not**. They are separate
   sites under the Public Suffix List, and nobody could sign in.

### What is not done, and why

- **SEO overrides** (the `Seo` rows) are not editable yet. Every page
  generates its metadata already.
- **Gallery order** cannot be set. The join table keeps no position;
  supporting it needs a schema change.
- **No password reset by email, and no second factor.** These were out of
  scope. An admin can reset someone's password under Accounts, and
  `admin:password` works from the shell.
- **Two old test enquiries named "Playwright"** (9 Aug) are still in the dev
  inbox. They are Muhammad's data; delete them from the panel if they are
  not wanted.

---

## Hosting on the Mac — 2026-10-13 — host side DONE; DNS waiting on Muhammad

Muhammad: "host it on the Mac", domain **`homeinn.xyz`**. It was bought on
Spaceship on 2026-09-19. Its nameservers are still Spaceship's, so it shows a
parked page.

The MacBook already hosts haifa-ai.com and providing-it-services.com from
`~/Development/Hosting`. That setup's own `README.md` and `HANDOUT.md` are the
authority on how the machine works. Home Inn joined it the same way the other
sites did.

**Done on the Mac (reached over Tailscale with `ssh mac`):**

- **Postgres:** Homebrew `postgresql@18` runs on **port 5433**. An older
  EnterpriseDB Postgres 17 already holds 5432 and was left alone. The
  database is `homeinn`.
- **Node:** Homebrew `node@24`, keg-only, via `NODE_BIN_DIR`. The shared
  `/usr/local` Node 22.12 serves the other sites. It is too old for pnpm 11,
  and its corepack cannot verify pnpm. It was not touched.
- **Checkout:** `~/Development/Hosting/sites/homeinn`. Its production `.env`
  (mode 600) has secrets generated on the Mac, never printed.
- **Content:** the dev database was copied with `pg_dump`/`pg_restore`: 27
  projects, 165 images, 7 services, 8 enquiries. `apps/api/uploads` was
  copied with `rsync` (178 folders, 102 MB).
- **Sessions:** the dev refresh tokens were deleted.
- **Admin password:** set to a fresh random password. It is in
  `~/homeinn-admin-password.txt` on the Mac (mode 600). Muhammad should sign
  in, change it, and delete the file.
- **Services:** `com.hosting.homeinn-api` (127.0.0.1:4200) and
  `com.hosting.homeinn-web` (127.0.0.1:3200), started by
  `deploy/start-api.sh` and `deploy/start-web.sh`.
- **Caddy:** `caddy/sites/homeinn.caddy`. The apex goes to :3200, www
  redirects to the apex, and `api.` goes to :4200. `X-Forwarded-For` is taken
  from Cloudflare's `Cf-Connecting-Ip`. Without that, every visitor would
  share one address, and the login and enquiry limits would apply to the
  whole site at once.
- **`hosting.sh`:** Home Inn has two rows, with health paths. `deploy` runs a
  site's own `deploy/host-build.sh` and restarts every service built from the
  same checkout. This was committed in the Hosting repo (`b908c0a`).
- **Verified:**
  - `hosting deploy homeinn` ran end to end: API 200, site 200.
  - Through Caddy: `/en`, `/bn/projects` and `/admins/login` answer 200, and
    www gives a 301.
  - haifa-ai.com and providing-it-services.com still answer 200 publicly.

**Changes in this repo for it:**

- The API binds to `HOST`.
- The web server reaches the API over `API_INTERNAL_URL`.
- `deploy/host-build.sh`, `deploy/start-*.sh` and `deploy/README.md`.
- An explicit `prisma generate`: inside the workspace, `@prisma/client`'s own
  postinstall leaves only a stub.

**What is left needs Muhammad's accounts.** The domain stays registered at
Spaceship; only its DNS moves to Cloudflare. The Mac has no public address
(CGNAT), so the site reaches the internet through the Cloudflare Tunnel, the
same way haifa-ai.com does. Cloudflare routes a hostname down a tunnel only if
that hostname's DNS zone is in the Cloudflare account. The steps:

1. In the Cloudflare dashboard, in the account that has haifa-ai.com, add
   the site `homeinn.xyz` on the Free plan.
2. In Spaceship, under homeinn.xyz → Nameservers → Custom, enter the two
   nameservers Cloudflare shows.
3. In the `homeinn.xyz` zone, add three **proxied** CNAMEs: `@`, `www` and
   `api`, each pointing to
   `3d1a3f81-0f5a-4aed-a339-be4496a16304.cfargotunnel.com`.
   (`cloudflared tunnel route dns` would put them in the haifa-ai.com zone by
   mistake; see the Hosting HANDOUT §7.)

cloudflared itself needs no change.

**Optional, later:** `SMTP_*` and `LEAD_NOTIFY_TO` in the Mac's `.env`, for
enquiry emails (needs a Gmail app password). Then run
`hosting deploy homeinn`.

### Visitor log on the Mac — `generations.csv` — 2026-10-13

Muhammad wanted one file in the Mac's hosting directory that logs everyone
who visits: their device, their location, everything available. It lives in
the Hosting repo, not here:

- **Script and service:** `scripts/visitor_log.py`, run as the launchd
  service `com.hosting.visitor-log`. It follows Caddy's access logs (all
  sites) and appends one row per page view, enquiry sent and admin sign-in
  (successful or failed) to `~/Development/Hosting/generations.csv`.
- **What each row holds:**
  - time (Dhaka), site, page
  - IP, and the location from Cloudflare's headers
  - device, OS, browser and language, parsed from the request
  - referrer
- **Privacy:** the file is mode 600 and never committed. A value that
  starts like a formula is neutralised before it is written.
- **Tests:** 21 unit tests, run on the Mac's own Python 3.9.
- **Found on install, fixed:** launchd restarted the service while I was
  replacing the file, and new rows went into the old, unnamed file. The
  script now writes by file name, so moving or clearing the CSV by hand is
  safe.
- **Location:** country is always sent. City, region, coordinates and time
  zone need Cloudflare's Managed Transform "Add visitor location headers",
  turned on per domain.

### Live on homeinn.xyz — two bugs found by the first real visits — 2026-10-13

The Cloudflare zone went active. Muhammad opened homeinn.xyz from another
device and was sent to **localhost**.

1. **Locale redirects went to the server's own address.**
   - **Cause:** next-intl builds the `/` → `/en` redirect from `request.url`,
     which behind the proxy is `http://localhost:3200`. Next then rebuilds any
     same-origin redirect on that address and ignores `Host` and
     `X-Forwarded-Host` while doing so.
   - **First fix (relative `Location`):** this broke Next's own middleware
     adapter, which needs an absolute URL ("Invalid URL", a 500). Calling the
     middleware directly in a unit test never runs that adapter.
   - **Final fix (`f7457c6`):** the middleware rebuilds the redirect on the
     visitor's own origin: the host and scheme Caddy forwards, accepted only
     if it is a bare host name. The redirect stays absolute. The test also
     checks that `Location` parses as a URL.
   - **Also:** next-intl's `Link` hreflang header is off. It was built as
     `http://`, and every page already declares its alternates in `<head>`.
2. **Every image was a 404.**
   - **Cause:** `main.ts` served `/media` from `join(cwd, UPLOAD_DIR)`. On the
     Mac, `UPLOAD_DIR` is an absolute path, and `join` glues it under the
     working directory. In dev it was relative, so this never showed.
   - **Fix:** `uploadRoot()` uses `resolve()`, with a unit test. The storage
     layer uses the same function.
   - **Cloudflare cached the 404s for a few minutes.** Purge the cache once,
     or wait.

**Checked publicly through Cloudflare:**

| Request | Result |
| --- | --- |
| `https://homeinn.xyz/` | 307 to `https://homeinn.xyz/en` (a Bangla browser goes to `/bn`) |
| `www` | 301 to the apex |
| `/admin` | 308 to `/admins` |
| `/en`, `/admins/login`, API health | 200 |
| an image at a fresh URL | 200 |

---

## Moderators, and an honest visitor log — 2026-10-19

### Where things stood after a week live

- **The site:** https://homeinn.xyz has been up the whole time on the Mac.
  Every service is loaded, all three sites answer 200, and the Home Inn
  checkout matched GitHub.
- **Open on Muhammad's side:**
  - Nobody has signed in to the panel yet. `~/homeinn-admin-password.txt`
    is still there.
  - The 8 enquiries in the inbox are all August test rows ("Playwright",
    "Demo Visitor"). No real enquiry has arrived.
  - Cloudflare's "Add visitor location headers" is still off: 1 row in
    10,842 has a city.
  - There is no Gmail app password yet, so no enquiry emails.
  - The furniture prices are still placeholders.
- **Error logs:** the web error log had "cachefn" server-action probes.
  These are scanners trying the RSC hole of late 2025; Next 15.5.22 and
  React 19.2.8 are patched against it. The API error log was clean.

### Visitor log: scanners are now "probe" (Hosting repo `fefc576`)

The first week counted scanners as page views. For example, `/.git/config`
was requested 40 times, by clients claiming to be Chrome, from servers in
the US, Poland and the Netherlands.

- A 4xx response for a dotfile, a PHP or WordPress path, or a well-known
  exploit target is now logged as event `probe`.
- 1,056 earlier rows were relabelled. Home Inn now shows 1,770 page views
  and 525 probes.
- `logs/visitor-log.state.json` is gitignored. There are 23 tests.

### Moderator role (`64ddf18`)

Muhammad asked for full access for himself, and for moderators who can
change prices and similar things but cannot touch how the site is built.

| | Admin | Moderator (stored as `EDITOR`) |
| --- | --- | --- |
| Enquiries: read, status, notes | yes | yes |
| Furniture (prices included), projects, testimonials, team, certifications, client logos, client lists, blog, images | yes | yes |
| Services, working areas, home page hero (the site's structure) | yes | **no** |
| Settings (phones, address, headline figures) | yes | **no** |
| Accounts | yes | **no** |
| Deleting anything | yes | **no** |

- **API:** the services, working-areas and hero writes are now `ADMIN`
  only. `test/roles.e2e-spec.ts` pins the whole table. API e2e: 143
  passed (3 todo).
- **Panel:**
  - EDITOR is shown as "Moderator" everywhere. There is no migration.
  - A moderator's menu has no Services, Working areas, Hero or Settings.
  - Typing one of their addresses shows "Only an admin…" and loads nothing.
  - The Accounts page explains both roles.
  - Web tests: 407.
- **Checked live on the Mac:** a temporary moderator account could save a
  furniture price (the same value, so nothing changed: 200). It got 403 on
  renaming a service, changing settings, listing accounts and deleting a
  piece. The account was then deleted.

To add one: **Admin → Accounts → Add an account**, role **Moderator**,
then give the first password in person.

### Setting the admin password without it passing through anyone — 2026-10-19

Muhammad's `ssh mac cat ~/homeinn-admin-password.txt` failed: his own shell
expanded `~` to `/home/muhammad` before ssh ran. Quote it:
`ssh mac 'cat ~/homeinn-admin-password.txt'`.

He asked for the password to be changed. Choosing it for him would have put
it in the chat. Instead, the Hosting repo now has
`scripts/homeinn-admin-password.sh` (`8ea7905`). It reads the new password
twice from a hidden prompt, sets it through `admin:password`, signs out the
account's other sessions, and deletes the first-password file only after
the change succeeds. It was dry-run against a nonexistent account, a
mismatch and a short password, and refused all three without changing
anything. To use it:

    ssh -t mac 'bash ~/Development/Hosting/scripts/homeinn-admin-password.sh'

---

## The phone hero: pan and rise — 2026-10-19 — DONE, live

Muhammad: on a phone the hero looked bland. He wanted the rooms to change
with a beautiful, crisp, smooth animation as you scroll down, as alive as
the left-to-right movement on desktop.

**Why it looked bland:** an upright phone shows about a third of a landscape
photograph (2560×1690 on a 390px screen). Each room was a still, cropped
middle, and its 4vw drift barely moved before it snapped to the next room.

**What it does now** (`components/hero/mobile-hero.tsx`, phones only):

- **Pan.** Each room's photograph is shown at full height in its own
  proportions, about 1,000px wide. The camera pans across it left to right
  with the scroll, so the whole room is seen.
- **Rise.** The next room rises from below. Its photograph moves a little
  slower than its window opens (parallax) and settles from a slight zoom.
  Meanwhile the previous room sinks back (scale 0.94) and darkens, like a
  stack of cards.
- **Crisp handovers.** `mobileTarget` follows the finger inside a room. A
  handover never rests halfway: let go mid-rise and it finishes or falls back
  on its own, so the hero always settles on one whole room.
- **Names.** The old name leaves through the top in the first half of the
  rise, and the new one comes up through a mask in the second half. Only one
  name shows at a time (`mobileLabel`).
- **Progress.** One mark per room fills as its pan goes, in place of the
  single line.
- **Pacing:** 100vh pinned plus 120vh of scroll per room.
- **Performance:** transforms and opacity only, written to the DOM each
  frame. React renders it once.
- **Unchanged:** desktop and reduced motion.

**Also:** the WhatsApp button stays hidden until the hero has scrolled away
(`usePastHero`). On a phone it used to appear after 300px, on top of the
rooms' names.

**Tests:**

- `hero-math`: frames, handover snapping, one name at a time, pacing.
- `panorama-hero`: pan shape, rooms waiting below, masked names, marks.
- `whatsapp-float`: stays hidden over the hero.
- Web total: 425.

**Checked in Brave as an iPhone 13, locally and then live:**

- every room pans
- a handover caught mid-rise shows one name at a time
- stopping inside a handover settles on a whole room
- the WhatsApp button is hidden during the hero and shown after
- reduced motion gives the static stack
- desktop still has the six-room panorama
- no page errors

**Ruling — axe on the phone home page:** axe flags the logo's orange "inn" at
1.57:1 against a computed #91918e. It cannot see the photograph under the
translucent header, so it assumes the stage's ink behind it. The real pixels
behind "inn" are cream in every room (#ECE1D1–#F8F4EA), giving 3.9–4.5:1,
which is above 3:1 for 24px text. Logo text is exempt from WCAG contrast in
any case. **Cost if wrong:** a wordmark slightly harder to read over a dark
photograph.

Deployed with `hosting deploy homeinn` (`0184bb5`).

### Phone hero, second pass: no pan, a shorter scroll — 2026-10-19 — DONE, live (`40e1382`)

Muhammad tried the pan. The landscape photographs scrolled across, then
scrolled again to reach the next room, so the hero was a long scroll and did
not look good. He suggested keeping each photograph's main part and cropping
the rest.

- **Crop instead of pan.** Each room is cropped to its main part, its focus
  point, and fills the screen. The focus point can be set per image under
  Admin → Hero → Focus point.
- **Kept:**
  - the rise: one swipe raises the next room, with a slight parallax and
    zoom, while the last one sinks back and darkens
  - names that change one at a time
  - a mark per room
- **Snapping:** the hero snaps to whole rooms like the desktop, so a short
  swipe finishes the change or falls back.
- **Shorter:** 80vh per change of room instead of 120vh per room. Three rooms
  now take 1.6 screens of scroll instead of 3.6.
- **Checked:**
  - Locally as an iPhone 13: the crop, the rises, and stopping 60% into a
    change (it goes on) or 36% in (it goes back).
  - Live after deploy. Web: 421 tests.

---

## Dark mode is dark everywhere, and the footer credit — 2026-10-19 — DONE, live (`4671eae`)

**Muhammad's two asks:**

1. A small line at the very bottom, in the site's own style: "site is
   developed and maintained by Haifa Intelligence".
2. "Lights off" should make the screen dark. In dark mode, much of the site
   was still lit.

**Why dark mode was half lit:** only the ink grounds (hero, header, footer,
the ink sections) were dark. Every cream section stayed cream: the
statement, the services, the project grid, and every inner page.

**The fix is a token swap in `app/globals.css`,** the light theme's swap run
the other way, so no component changed.

- `[data-theme="dark"]` turns:
  - the cream ground to charcoal (`#1B1F22`, a step above ink, so sections
    still alternate)
  - its charcoal text to warm light (`#ECE6DA`)
  - the light panels and hovers to raised charcoal (`#2A3034`)
  - walnut icons lighter (`#C99A6B`)
  - the accent to ember
- `color-scheme: dark` makes the form's native controls dark too.
- `[data-theme="dark"] .ground-ink` keeps the ink grounds as they were.
- `app/theme.test.ts` pins the tokens and the contrast on the new ground:
  body text 13:1, 65% muted text 6.5:1, ember 4.9:1, icons above 3:1.
- **Checked:** sampling the backgrounds down each page in dark mode found 0
  light areas on home, services, contact and furniture. The only light
  points on the projects and villa pages were photographs.

**The credit:** the footer now ends with "Site developed and maintained by
Haifa Intelligence" (Bangla: "সাইটটি তৈরি ও রক্ষণাবেক্ষণ করেছে Haifa
Intelligence").

- Set in the footer's small muted type, with the name as a link to
  https://haifa-ai.com in a new tab.
- The message key is `common.credit`, in both catalogues.

Web: 426 tests, typecheck and lint clean. Deployed, and checked live in
both languages.

### The footer credit's link is underlined (`7bf1d71`)

axe on the live site flagged the credit link in light mode
(`link-in-text-block`): its colour is only 2.26:1 against the surrounding
text, so colour alone does not mark it as a link. It is now always
underlined. `site-footer.test.tsx` pins the underline.

## The new Facebook page — 2026-10-19 — DONE, live (`d6b970d`)

Muhammad: the Facebook link is now https://www.facebook.com/homeinn.xyz.

- **Live:** updated `SiteSettings.facebookUrl` in the Mac's database and
  revalidated the `settings` tag, so the header and footer changed at once,
  in both languages. No redeploy was needed.
- **Repo:** `apps/api/prisma/seed.ts`, and the test fixtures that mirror it
  (`test/render.tsx`, `lib/seo.test.ts`, `site-header.test.tsx`).
- **Leftover:** the "homeinnbd14" still on each page is the email
  `homeinnbd14@gmail.com` in the structured data. That is correct, not the
  old link.

## Dark mode: the blueprint shows, and WhatsApp stays readable — 2026-10-19

**Muhammad, with a screenshot of the statement section:** the blueprint
drawing behind it could not be seen at all with the lights off. He asked for
just its lines to take the light theme's colour.

**Why it vanished:** the plan is drawn in `currentColor` at 7%
(`text-ink/[0.07]`). On cream that is a faint charcoal drawing. Dark mode
turns ink light, and 7% of light on charcoal all but disappears.

**The fix:**

- With the lights off, the plan is now drawn in the logo's cream (`#F3EDE2`)
  at 20%. That value was chosen from live previews at 14%, 20% and 28%: at 20%
  the drawing reads about as strongly as it does on cream, and 28% starts to
  compete with the copy.
- New `dark:` variant in `app/globals.css`. It follows `<html
  data-theme="dark">`, the lamp in the header. Tailwind's own `dark:` reads
  the operating system's preference, which would disagree with the switch.

**Found by the live axe sweep (dark mode):** the WhatsApp button's label was
cream on WhatsApp green, 1.59:1, on every page at desktop width. The cause:
the button used `text-ink`, which dark mode turns cream. It now uses a
literal charcoal (`#14181A`, 9.7:1). Light mode had no violations.

**Tests:** `statement.test.tsx` (the cream plan), `theme.test.ts` (the
variant follows the lamp) and `whatsapp-float.test.tsx` (charcoal in either
theme). Each was seen failing first. Web: 430 tests, typecheck clean.

## Furniture photos with Qwen-Image 2.1: the dressing table trial — 2026-10-19 — trial only, nothing on the site

**Muhammad:** the furniture photos look bad: shot at an angle, in workshops
and half-finished rooms. Could the local AI models (Qwen Image) show them
from the front on a better background, maybe with a small Home Inn logo, with
the furniture kept as close to the original as possible, and in a way that
can be rolled back? Think it through first, then try the dressing table.

**Where the work lives:** `~/Development/HomeInn-photos/`, outside the repo
because the images are large.

- `originals/`: the source JPEG, found at full size (3120×4160) in
  `/mnt/volume100/HomeInn Interior and Furniture/IMG_20240608_160758.jpg`,
  plus the logo.
- `trial/`: every output. Each comes with a `.json` holding the prompt, seed
  and settings, so it can be made again.
- `workflows/qwen_edit.py`: runs Qwen-Image 2.1 edit through ComfyUI's API.
  Model `qwen_image_2.1_int8_convrot`, encoder `qwen3vl_8b_int8_convrot`,
  cfg 1, euler/simple, 40 steps, resolution 2048 (1760×2368 out). It takes
  about 4.5 minutes per image on the 3090.
- ComfyUI runs from `~/AI/ComfyUI`:
  `venv/bin/python main.py --listen 127.0.0.1 --port 8188`.

**Results** (`trial/compare-dressing-unit.jpg`):

- **A, same angle, new background** (`a-bg-2k.png`). Faithful: the stepped
  block frame, the two-block carved handles, the keyhole, the grain and the
  open drawer all match. Door and wardrobe are gone; the wall is off-white
  and the floor light stone. The mirror reflects the new room.
- **B, front view** (`b-front-2k.png`). The model handled the stepped
  corners, but the handles became four-block squares (two blocks in the
  original), and it invented the base, which the original never shows. Not
  the same piece, so not usable as a product photo as it stands.
- **C, A plus the logo** (`c-logo-2k.png`). The real logo file is
  composited onto the wall with a soft shadow, like raised letters. It is
  not drawn by the model, which would misspell it.

**Rulings:**

- The logo is composited, not generated. A model can garble text, and a
  composite is the exact mark.
- Asking Qwen to turn the composited logo into a 3D sign broke the whole
  image (oversharpened, noisy). The input PNG carried an alpha channel from
  the composite, and was itself an AI output. Next time, flatten inputs
  (`-alpha off`) and edit from the original photo.

**Rollback plan, for when a version is chosen:**

- New images go into the media library as new rows.
- Only the product's cover switches to the new image.
- The old images stay in the library, so rolling back is pointing the cover
  back from the admin panel.
- A manifest of product → old media id → new media id will be kept in the
  repo.

**Parked:** Muhammad's idea of clicking into a product and turning it round
(360°).

## Furniture: the cover with the logo, turning to a front view on hover — 2026-10-19 — DONE, live

**Muhammad, after the trial:** go with C, the photo at its real angle with
the logo. On hover it should animate between B (the front view) and C. Put
the logo in B too, so it is always there. Do this for every piece of
furniture.

### The site (`2fc088c`, `82f2768`)

- **Data:** `ShopProduct.secondViewId`, nullable, `ON DELETE SET NULL`.
  - Migration `20261019131718_add_product_second_view` only adds a column.
  - The public list and detail, and the admin read surface, return
    `secondView`.
- **Admin:** a "Second view" media field on the furniture editor. Clearing
  it takes the piece back to the cover alone.
- **`components/furniture/product-views.tsx`:**
  - The second view is laid over the cover. Hover or keyboard focus brings
    it in from a slight zoom.
  - It is `aria-hidden`, so the piece is not described twice.
  - The card and the product page both use it.
- **Touch screens** cannot hover, so the two views take turns on their own:
  an 8-second cycle in `globals.css`, off when motion is reduced. This was
  my call, made without asking.
- **`pnpm product:views apply <manifest>` / `rollback <file>`** (API):
  - Every photo goes into the library as a new image first. Then every
    piece changes in one transaction.
  - It writes a rollback file of the ids it replaced, and rollback restores
    them.
  - Old images are never deleted.
- **Tests:** web 436, API e2e 147 + 3, unit 98, typecheck and lint clean.
  `accounts.e2e-spec.ts`'s "ends a demoted admin's session" failed once in
  a full run, then passed twice on its own. It is a timing flake from
  before this work.

### The photos (`~/Development/HomeInn-photos/`)

- **`workflows/batch.py`** makes, for each piece:
  - A: the same angle on the new background
  - B: the front view, two seeds
  Each prompt names the piece's own details (handles, carving, drawers), so
  the model keeps them. Run log: `out-batch.log`.
- **`workflows/compose.py`** puts the real logo on both views at the same
  spot, so it holds still while they cross-fade.
  - It picks the quietest stretch of wall near the top right of what the
    site shows (the 4:5 frame), judged across both images.
  - It writes `final/<slug>/cover.png`, `second.png` and `placement.json`.
- ComfyUI runs from the Python in `~/AI/ComfyUI/venv`, which also has PIL;
  the system Python has none.

### What went live

**The six pairs** (`final/overview.jpg`). For each piece, the cover is A and
the second view is the B seed that matched the original best:

| Piece | Second view | Notes |
| --- | --- | --- |
| Dressing unit | b-20261019 | Seed 7 turned the two-block handles into a bow-tie. |
| Carved wardrobe | b-7 | Its crest is closest, and the logo clears it. |
| Steel shelving | b-20261019 | The original is two units side by side. A keeps them; the front view draws one frame. |
| Office desk | b-20261019 | It keeps the walnut panel at the junction. |
| Executive desk | b-20261019 | The plastic film and the loose leaning panel are gone; the structure is the original's. |
| Bedroom wall unit | b-20261019 | Its window grille matches. |

**Wide photos:** the two desks were wider than the site's 4:5 frame, which
cut off their ends. `compose.py` now reflects the plain wall upward and the
floor downward to make them 4:5. The furniture itself is untouched.

**The bedroom wall unit:** its top right is ceiling, not wall. There the logo
is set by hand (`0.47,0.295`) on the teal feature wall, with "Home" turned
cream so it reads on teal.

**Applied on the Mac:**

- Ran `pnpm product:views apply` with
  `~/Development/Hosting/sites/homeinn-product-views/2026-10-19/manifest.json`.
- It added 12 new images, changed 6 pieces in one transaction, and
  revalidated the `products` tag (200).
- `docs/product-views/2026-10-19.json` records every piece's media ids
  before and after, and how to undo the change: for the whole set, or one
  piece from the admin panel.

**A bug found live, then fixed (`c3ff3aa`):** Tailwind's `scale-[1.03]`
sets the `scale` property, but the touch-screen keyframes animated
`transform`. So on a phone the second view stayed at 1.03, and its logo sat
about 10px off the cover's. The keyframes now animate `scale`, and
`theme.test.ts` pins it. On a phone, the second view is now at scale 1
whenever it is fully shown.

**Checked live:**

- Desktop hover turns the wardrobe to its front view with the logo still.
- The phone turns on its own.
- The product page shows the pair.
- axe is clean on `/en/furniture`, `/bn/furniture` and a product page, in
  light and dark, at 1440 and 393.
- Web tests: 437.

**ComfyUI** was stopped afterwards, to give the GPU back.

## The furniture photo job, written up for Haifa Intelligence — 2026-10-19

**Muhammad:** this is business-tailored AI, Haifa Intelligence work. Write it
up as a .md file, keep the method as a skill, and put the .md on one of his
drives (he chose shinrinyoku).

- **Case study:**
  `~/Development/Haifa Intelligence/docs/case-studies/home-inn-furniture-photos.md`,
  with `before.jpg`, `after.jpg` and `trial-dressing-unit.jpg` in the folder
  beside it.
  - It is not committed in that repo; that is left to him.
  - A copy is at `/mnt/shinrinyoku/Haifa Intelligence/Case studies/`,
    byte-identical.
- **Skill:** `~/.claude/skills/restaging-product-photos/` holds `SKILL.md`
  and `scripts/` (`qwen_edit.py`, `batch.py`, `compose.py`).
  - **Tested** with a fresh agent on a new client (cabinets and sofas):
    - Without the skill, it refused the front view, gave a negative prompt
      at cfg 1, upscaled from 1 MP, and laid the logo on as a faded
      watermark.
    - With the skill, it planned A as the cover and B as a disclosed second
      view, 2K, no negative prompt, the logo composited at the same pixels,
      a 4:5 frame, a one-transaction apply with rollback, and a live phone
      check.
  - **Gaps the testers found, now closed:**
    - In `compose.py`:
      - the logo's shape is read from the file;
      - a cover can be stamped alone (`-`);
      - 9:16 photos have their side walls extended;
      - it refuses to mirror an edge that is not plain wall or floor (it
        would copy the product), and photos wider than about 16:10;
      - `auto light` works.
    - In `batch.py`: per-piece `seed_a` and `seeds_b`.
    - In `SKILL.md`: a pass mark for the faithfulness check, HEIC/EXIF, the
      cut-out fallback tools, reflections in glossy surfaces, and what to do
      when a site has only a cover.
  - The changed `compose.py` reproduces the shipped Home Inn images
    byte-for-byte.

## Next: "Haifa AI", furniture from a sketch — 2026-10-19 — idea only, parked

**Muhammad's idea:**

- On the Home Inn site, a visitor draws a piece of furniture, or uploads a
  hand drawing or a screenshot as a reference.
- We generate several versions.
- They choose the wood, its colour, and other options. For example, a cradle
  (dolna) can be wood or bamboo.

Is it possible? **Yes.** He wants to sit down on it next time. Nothing has
been built.

**What already exists:** Haifa Intelligence's AI Studio bridge.

- Code: `~/Development/Haifa Intelligence/apps/api`.
- It runs beside ComfyUI on the GPU PC, with a queue, live progress and
  image upload.
- Sites on the Mac reach it over Tailscale through `STUDIO_BRIDGE_URL` and
  `STUDIO_BRIDGE_KEY`.
- The Home Inn site could use the same bridge, with Qwen-Image 2.1 edit and
  the sketch as image 1. No paid API.

**The shape I proposed (not agreed):**

- The visitor draws on a canvas or uploads an image.
- They pick from structured options: type, wood (teak, mahogany, gamari, oak,
  bamboo, cane), colour and finish, and upholstery.
- We make 3–4 variants.
- "Send to Home Inn for a quote" turns the chosen one into a lead in the
  admin inbox, with the image attached.

**Known limits:**

- About 25–30 seconds per draft image, so about 2 minutes for four. One GPU
  means a queue.
- When the PC is off, the feature shows "GPU offline".
- It makes a picture, not a construction drawing. Dimensions, joinery and
  price stay with the carpenter.
- The model can drift from the sketch. Qwen 2.1 FunControl in ComfyUI is
  worth trying to hold the shape.
- Public uploads need structured options rather than free text, a limit per
  IP, size limits, and no long-term keeping of uploads.

**The open question to start with:** who uses it? A customer planning a
piece at home, or Home Inn's staff sitting with a client in the showroom?

**Size:** a project. Next time, it gets a written design before any code.
