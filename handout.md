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
