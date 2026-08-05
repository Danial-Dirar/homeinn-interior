# Phase 1B — Public Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date:** 2026-08-05
**Spec:** `docs/superpowers/specs/2026-08-03-homeinn-phase1-design.md` (§6 IA, §7 hero, §8 visual, §9 i18n, §11 SEO/privacy, §12 honest content, §13 testing)
**Predecessor:** `docs/superpowers/plans/2026-08-03-phase1a-foundation-api.md` — complete except the client-table seed, which is blocked on the company profile PDF.

**Goal:** Build the bilingual public marketing site at `apps/web` — every route in spec §6 except `/admin`, driven entirely by the Phase 1A API.

**Architecture:** A Next.js 15 App Router application under `apps/web`, locale-prefixed at `/[locale]`, rendering server-side from the NestJS REST API. Pages fetch and pass data down; components render and are unit-tested; the signature scroll panorama hero is a self-contained client component whose progress→transform maths is a set of pure functions tested without a DOM. Two small API tasks come first, because the Phase 1A public read surface returns image *ids* but no image *URLs* — nothing can render until that is fixed.

**Tech Stack:** Next.js 15 (App Router, React 19) · next-intl · Tailwind CSS v4 (CSS-first `@theme`) · shadcn/ui in `packages/ui` · Lenis · Vitest + Testing Library · Playwright + axe-core · Zod (shared via `@homeinn/types`)

---

## Deviations from the spec, stated up front

Three are worth a decision before execution starts. Each is reversible.

| Spec §8 says | This plan does | Why |
|---|---|---|
| GSAP ScrollTrigger pins the hero | `position: sticky` (the spec's own §7 markup) + a rAF-throttled progress hook | The §7 structure is already `sticky top-0 h-dvh` — sticky *is* the pin, so ScrollTrigger would only be computing a number. Dropping it saves ~60 KB against the §7 budget of LCP < 2.5 s on mid-range Android over 4G, and makes progress→transform a pure function, which §13 explicitly asks to test as one. |
| Framer Motion for component entrances | A 25-line `useReveal` hook (IntersectionObserver + CSS transition) | Entrances are fade-and-rise. ~30 KB of animation runtime on every page for that does not survive the same budget. One reduced-motion gate either way. |
| 21st.dev registry for marquee / testimonial carousel / bento / comparison slider | A CSS-only marquee in `packages/ui` | Of the four blocks, only the marquee has a use in Phase 1B — testimonials seed empty and hide (§12), and bento/comparison are not in the §6 IA. A CSS marquee is ~20 lines and gates on reduced-motion more cleanly than a JS one. |

Lenis **is** kept: it is what produces the cinematic feel §8 asks for, and it is small.

If you want the spec honoured literally instead, Tasks 9, 10 and 12 are the only ones affected.

One further note, not a deviation: Tailwind v4 has no JavaScript preset mechanism. The "Tailwind preset" of §8 is realised as a CSS-first `@theme` block in `apps/web/app/globals.css`, with `@source` pointing at `packages/ui` so utility classes in the shared package are scanned.

---

## Global Constraints

Every task's requirements implicitly include this section.

- **Node ≥ 22, pnpm 11.18.0.** Workspaces are `apps/*` and `packages/*`.
- **TypeScript strict**, inherited from `@homeinn/config/tsconfig.base.json`, including `noUncheckedIndexedAccess: true` — indexing an array yields `T | undefined` and must be narrowed. This bites hardest in the hero maths.
- **Bilingual, always.** UI chrome strings live in `messages/{en,bn}.json`; content strings live in the database as `*En` / `*Bn` column pairs. **There is no English fallback for a `bn` page** — the failure mode spec §9 designs against is a Bangla page silently rendering English. The API's `bilingualText` schema already guarantees both columns are non-empty.
- **Honest content (spec §12).** A section whose only source is the company profile PDF — which is *not in this repository* — renders **only** when its data or its messages are non-empty. Never invent copy, client names, testimonials, team members, or statistics. The three headline counts (73 corporate projects, 57 residential, 13 districts) and the seven services, nine working areas and three credentials are seeded and real; use those.
- **Residential privacy (spec §11).** No residential client name renders anywhere on the public site, in any locale, in any markup — including JSON-LD, OG tags and `title` attributes. `/clients` shows the residential track record as a count and a district list only.
- **Palette, verbatim from §8** — these exact values, no others:
  `ink #0B0B0C` · `ink-raised #141416` · `ink-line #232326` · `bone #F6F2EC` · `sand #E7DFD2` · `sand-dim #9C948A` · `walnut #7A5537` · `amber #C9A227` · `brand #E01B24`.
  **`brand` is used for CTA, active nav, focus ring, and section numerals — nothing else.**
- **Type, from §8:** Fraunces (display), Geist (body/UI), Anek Bangla with Noto Sans Bengali fallback (Bangla). Bangla headings render at 0.94× the Latin size with looser leading, applied once in the theme, never per component.
- **Motion is progressive enhancement.** Every animated surface passes through one `usePrefersReducedMotion()` check. The reduced-motion path is a first-class layout, not a degraded one.
- **Pages fetch, components render.** `page.tsx` files are thin: they call the API and pass plain props. All logic-bearing rendering lives in `components/`, which is where Vitest + Testing Library run. Async server components are covered by Playwright, not by unit tests.
- **The lead form POSTs from the browser straight to the API.** Never through a Next.js Server Action or route handler. `POST /api/leads` is throttled at 5/hour **per IP**; proxying through the Next server collapses every visitor onto one IP and the sixth lead of the hour from anywhere in Bangladesh would 429.
- **Images come from the API's own pipeline, not `next/image`.** The API already emits responsive AVIF + WebP derivatives at 480/960/1440/1920 with a `srcset`. Re-optimising them through Next's loader would decode and re-encode work that is already done. Render `<picture>`.
- **After editing `packages/types`, run `pnpm --filter @homeinn/types build`** — it resolves from `dist/`, and consumers fail with "has no exported member" otherwise.
- **Commit after every task**, with the message given in that task's final step.

---

## File Structure

### API changes (Tasks 1–2)

| File | Responsibility |
|---|---|
| `apps/api/src/media/blurhash.ts` | **new** — `blurhashOf(buffer)`, the only place sharp raw pixels meet the blurhash encoder |
| `apps/api/src/media/blurhash.spec.ts` | **new** — round-trip test |
| `apps/api/src/media/media.service.ts` | store the blurhash at ingest; add `view()` / `viewMany()` so other modules can serialise a `Media` row |
| `packages/types/src/media.ts` | add `publicMediaSchema` / `PublicMedia` — the one shared definition of a serialised image |
| `apps/api/src/content/{services,projects,blog,testimonials,team,certifications,hero}.service.ts` | include the relevant media (and `seo` on detail routes) and map it through `MediaService.view` |
| `apps/api/src/content/content.module.ts` | import `MediaModule` |
| `apps/api/test/public-api.e2e-spec.ts` | extend the Plan 1B contract with the media shape |

### Web app

| File | Responsibility |
|---|---|
| `apps/web/package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `vitest.config.ts`, `vitest.setup.ts`, `eslint.config.mjs`, `playwright.config.ts` | app configuration |
| `apps/web/app/globals.css` | Tailwind v4 entry, the §8 palette as `@theme` tokens, the bilingual type scale |
| `apps/web/app/layout.tsx` | root shell — passes through to `[locale]` |
| `apps/web/app/[locale]/layout.tsx` | `<html lang>`, fonts, `NextIntlClientProvider`, header, footer, smooth scroll |
| `apps/web/app/[locale]/{page,about,services,projects,clients,blog,contact}/…` | one thin fetch-and-pass file per §6 route |
| `apps/web/app/[locale]/{not-found,error}.tsx` | error boundaries |
| `apps/web/app/{sitemap,robots}.ts` | generated from published content, both locales |
| `apps/web/i18n/{routing,request,navigation}.ts` | next-intl configuration and locale-aware `Link` |
| `apps/web/middleware.ts` | locale detection and prefixing |
| `apps/web/messages/{en,bn}.json` | UI chrome strings |
| `apps/web/lib/env.ts` | `apiBaseUrl()`, `siteUrl()` — env reading in exactly one place |
| `apps/web/lib/api.ts` | typed fetch wrapper, cache tags, `ApiError` |
| `apps/web/lib/api.types.ts` | response shapes of the public read surface |
| `apps/web/lib/content.ts` | one named function per endpoint (`getServices()`, `getHero(target)`, …) |
| `apps/web/lib/locale-text.ts` | `text(row, field, locale)` — the `*En`/`*Bn` picker |
| `apps/web/lib/media.ts` | `largestSrc`, `blurhashAverageColor`, `<Picture>` props |
| `apps/web/lib/seo.ts` | metadata builders, JSON-LD builders |
| `apps/web/components/hero/hero-math.ts` | pure progress→transform functions |
| `apps/web/components/hero/panorama-hero.tsx` | the pinned strip, its fallbacks |
| `apps/web/components/layout/*` | header, footer, locale switcher, WhatsApp affordance |
| `apps/web/components/sections/*` | one file per home-page section of §6 |
| `apps/web/components/forms/lead-form.tsx` | the consultation/contact form |
| `apps/web/components/media/picture.tsx` | `<picture>` wrapper with blurhash ground |
| `apps/web/hooks/{use-prefers-reduced-motion,use-scroll-progress,use-reveal}.ts` | the three motion primitives, all gated |
| `apps/web/e2e/*.spec.ts` | Playwright flows, axe sweeps, hero visual regression |
| `packages/ui/*` | shadcn primitives + the CSS marquee, consumed via `transpilePackages` |
| `ASSET-CHECKLIST.md` | repo root — every image slot from §15 and whether it is filled |

---

## Task 1: API — blurhash at ingest, and a reusable media view

**Files:**
- Create: `apps/api/src/media/blurhash.ts`
- Create: `apps/api/src/media/blurhash.spec.ts`
- Modify: `apps/api/src/media/media.service.ts`
- Modify: `apps/api/src/media/media.service.spec.ts`
- Modify: `packages/types/src/media.ts`
- Modify: `apps/api/package.json` (add `blurhash`)

**Interfaces:**
- Consumes: `MediaService.toPublic(media)` and `derivativeWidths(width)`, both already in `media.service.ts`; `StorageService.publicUrl(key)`.
- Produces:
  - `blurhashOf(source: Buffer): Promise<string>`
  - `MediaService.view(media: Media | null | undefined): PublicMedia | null`
  - `MediaService.viewMany(rows: Media[]): PublicMedia[]`
  - `PublicMedia` exported from `@homeinn/types` — `Media` fields plus `sources: { type: string; srcset: string }[]`

`Media.blurhash` has existed as a nullable column since Task 4 of Plan 1A but nothing has ever written to it. Spec §7 names it as the hero's LCP placeholder, so it needs to exist before the hero can be built.

- [ ] **Step 1: Install the encoder**

```bash
pnpm --filter @homeinn/api add blurhash
```

- [ ] **Step 2: Write the failing test**

Create `apps/api/src/media/blurhash.spec.ts`:

```ts
import { decode } from "blurhash";
import sharp from "sharp";
import { blurhashOf } from "./blurhash";

async function solid(color: string, width = 400, height = 300): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer();
}

describe("blurhashOf", () => {
  it("produces a string the reference decoder accepts", async () => {
    const hash = await blurhashOf(await solid("#336699"));
    expect(typeof hash).toBe("string");
    expect(() => decode(hash, 8, 8)).not.toThrow();
  });

  it("encodes the average colour into the DC component", async () => {
    // Bytes 2..6 of a blurhash are the base83-encoded 24-bit sRGB average.
    const hash = await blurhashOf(await solid("#336699"));
    const B83 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";
    let dc = 0;
    for (const c of hash.slice(2, 6)) dc = dc * 83 + B83.indexOf(c);

    const [r, g, b] = [(dc >> 16) & 255, (dc >> 8) & 255, dc & 255];
    expect(Math.abs(r - 0x33)).toBeLessThan(12);
    expect(Math.abs(g - 0x66)).toBeLessThan(12);
    expect(Math.abs(b - 0x99)).toBeLessThan(12);
  });

  it("gives different hashes for different images", async () => {
    expect(await blurhashOf(await solid("#000000")))
      .not.toBe(await blurhashOf(await solid("#ffffff")));
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

```bash
pnpm --filter @homeinn/api test -- blurhash
```
Expected: FAIL — `Cannot find module './blurhash'`.

- [ ] **Step 4: Implement**

Create `apps/api/src/media/blurhash.ts`:

```ts
import { encode } from "blurhash";
import sharp from "sharp";

/** Component counts along each axis. 4×3 is the reference default for landscape. */
const COMPONENTS_X = 4;
const COMPONENTS_Y = 3;

/**
 * A blurhash of the source image. Encoded from a 32px thumbnail because the
 * algorithm only ever produces a handful of DCT components — feeding it full
 * resolution costs time and changes nothing.
 */
export async function blurhashOf(source: Buffer): Promise<string> {
  const { data, info } = await sharp(source)
    .raw()
    .ensureAlpha()
    .resize(32, 32, { fit: "inside" })
    .toBuffer({ resolveWithObject: true });

  return encode(new Uint8ClampedArray(data), info.width, info.height, COMPONENTS_X, COMPONENTS_Y);
}
```

- [ ] **Step 5: Run it and watch it pass**

```bash
pnpm --filter @homeinn/api test -- blurhash
```
Expected: PASS, 3 tests.

- [ ] **Step 6: Write the failing test for ingest storing it**

Append to `apps/api/src/media/media.service.spec.ts`, inside the existing `describe("MediaService.ingest", …)`:

```ts
  it("stores a blurhash placeholder", async () => {
    const svc = new MediaService(fakePrisma() as never, fakeStorage());
    const row = await svc.ingest(
      { buffer: await png(600, 400), mimetype: "image/png", originalname: "a.png" }, alt);
    expect(typeof row.blurhash).toBe("string");
    expect((row.blurhash as string).length).toBeGreaterThan(6);
  });
```

And a new block at the end of the file:

```ts
describe("MediaService.view", () => {
  const row = {
    id: "m1", storageKey: "abc", mimeType: "image/jpeg",
    width: 1920, height: 1080, bytes: 100, blurhash: "LEHV6nWB",
    altEn: "A room", altBn: "একটি ঘর", createdAt: new Date(),
  };

  it("returns null for a missing relation", () => {
    const svc = new MediaService(fakePrisma() as never, fakeStorage());
    expect(svc.view(null)).toBeNull();
    expect(svc.view(undefined)).toBeNull();
  });

  it("adds one source per format, widest last", () => {
    const svc = new MediaService(fakePrisma() as never, fakeStorage());
    const view = svc.view(row);
    expect(view?.sources.map((s) => s.type)).toEqual(["image/avif", "image/webp"]);
    expect(view?.sources[0]?.srcset).toContain("http://cdn.test/abc/1920.avif 1920w");
  });

  it("maps a list", () => {
    const svc = new MediaService(fakePrisma() as never, fakeStorage());
    expect(svc.viewMany([row, row])).toHaveLength(2);
  });
});
```

- [ ] **Step 7: Run and watch it fail**

```bash
pnpm --filter @homeinn/api test -- media.service
```
Expected: FAIL — `row.blurhash` is undefined, and `svc.view is not a function`.

- [ ] **Step 8: Implement both**

In `apps/api/src/media/media.service.ts`, add the import and extend `ingest`'s `create` data:

```ts
import { blurhashOf } from "./blurhash";
import type { PublicMedia } from "@homeinn/types";
```

```ts
    return this.prisma.media.create({
      data: {
        storageKey: key,
        mimeType: file.mimetype,
        width: meta.width,
        height: meta.height,
        bytes: file.buffer.byteLength,
        blurhash: await blurhashOf(file.buffer),
        altEn: alt.altEn.trim(),
        altBn: alt.altBn.trim(),
      },
    });
```

Change `toPublic`'s return type to `PublicMedia` and add the two view helpers below it:

```ts
  /** A media row plus the srcset strings the web app renders from. */
  toPublic(media: Media): PublicMedia {
    const widths = derivativeWidths(media.width);
    return {
      ...media,
      sources: FORMATS.map((format) => ({
        type: `image/${format}`,
        srcset: widths
          .map((w) => `${this.storage.publicUrl(`${media.storageKey}/${w}.${format}`)} ${w}w`)
          .join(", "),
      })),
    };
  }

  /** Serialises an optional relation. Content services call this on every include. */
  view(media: Media | null | undefined): PublicMedia | null {
    return media ? this.toPublic(media) : null;
  }

  viewMany(rows: Media[]): PublicMedia[] {
    return rows.map((m) => this.toPublic(m));
  }
```

- [ ] **Step 9: Add the shared type**

Append to `packages/types/src/media.ts`:

```ts
export const mediaSourceSchema = z.object({
  type: z.string(),
  srcset: z.string(),
});

/**
 * A `Media` row as the public read surface serialises it: the stored columns
 * plus the responsive `srcset` per format. The web app renders `<picture>`
 * straight from this, so the shape is a contract, not an implementation detail.
 */
export const publicMediaSchema = z.object({
  id: z.string(),
  storageKey: z.string(),
  mimeType: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  bytes: z.number().int(),
  blurhash: z.string().nullable(),
  altEn: z.string(),
  altBn: z.string(),
  createdAt: z.coerce.date(),
  sources: z.array(mediaSourceSchema),
});
export type PublicMedia = z.infer<typeof publicMediaSchema>;
```

- [ ] **Step 10: Rebuild types, then run**

```bash
pnpm --filter @homeinn/types build
pnpm --filter @homeinn/api test
pnpm typecheck
```
Expected: all API unit tests pass (52+), typecheck clean.

- [ ] **Step 11: Commit**

```bash
git add apps/api packages/types
git commit -m "feat(api): encode a blurhash at ingest and expose a media view"
```

---

## Task 2: API — media and SEO on the public read surface

**Files:**
- Modify: `apps/api/src/content/content.module.ts`
- Modify: `apps/api/src/content/{services,projects,blog,testimonials,team,certifications,hero}.service.ts`
- Modify: `apps/api/test/public-api.e2e-spec.ts`

**Interfaces:**
- Consumes: `MediaService.view` / `viewMany` from Task 1; `MediaModule` already `exports: [MediaService]`.
- Produces: every public read now carries its images.
  - `GET /api/services` → each row `+ cover: PublicMedia | null`
  - `GET /api/services/:slug` → `+ cover`, `+ gallery: PublicMedia[]`, `+ seo: { titleEn, titleBn, descriptionEn, descriptionBn, ogImage: PublicMedia | null } | null`
  - `GET /api/projects` → `+ cover`; `GET /api/projects/:slug` → `+ cover`, `+ gallery`, `+ seo`, `+ workingArea`
  - `GET /api/hero` → `+ image: PublicMedia`, `+ foreground: PublicMedia | null`
  - `GET /api/blog` → `+ cover`; `GET /api/blog/:slug` → `+ cover`, `+ seo`
  - `GET /api/testimonials` → `+ avatar`; `GET /api/team` → `+ photo`; `GET /api/certifications` → `+ document`

List routes carry the cover only; galleries and SEO belong to detail routes, where the extra join is paid once.

- [ ] **Step 1: Write the failing e2e**

Append to `apps/api/test/public-api.e2e-spec.ts`, after the existing `describe("public read surface", …)` block:

```ts
describe("media on the public read surface", () => {
  it("returns the hero background as a rendered image, not an id", async () => {
    const res = await request(server()).get("/api/hero").expect(200);

    const segment = res.body[0];
    expect(segment.image).toBeTruthy();
    expect(segment.image.altEn).toBe("A living room");
    expect(segment.image.altBn).toBe("একটি বসার ঘর");
    expect(segment.image.width).toBe(1920);
    expect(segment.image.sources.map((s: { type: string }) => s.type))
      .toEqual(["image/avif", "image/webp"]);
    expect(segment.image.sources[0].srcset).toMatch(/\d+w$/);
    expect(segment.foreground).toBeNull();
  });

  it("returns a null cover rather than omitting the key", async () => {
    const res = await request(server()).get("/api/services").expect(200);

    expect(res.body.length).toBeGreaterThan(0);
    for (const service of res.body) {
      expect(service).toHaveProperty("cover");
    }
  });

  it("returns gallery and seo on a service detail, and its working area on a project", async () => {
    const list = await request(server()).get("/api/services").expect(200);
    const slug = list.body[0].slug;

    const res = await request(server()).get(`/api/services/${slug}`).expect(200);
    expect(Array.isArray(res.body.gallery)).toBe(true);
    expect(res.body).toHaveProperty("seo");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm db:start
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @homeinn/api test:e2e -- public-api
```
Expected: FAIL — `segment.image` is undefined; `service` has `coverId` but no `cover`.

- [ ] **Step 3: Let the content module reach MediaService**

`apps/api/src/content/content.module.ts` — add `MediaModule` to `imports`:

```ts
import { MediaModule } from "../media/media.module";
```
```ts
  imports: [AuthModule, MediaModule],
```

- [ ] **Step 4: Include and serialise, service by service**

`apps/api/src/content/hero.service.ts` — the critical one. Inject `MediaService`, add the include, map the result:

```ts
import { MediaService } from "../media/media.service";
import type { PublicMedia } from "@homeinn/types";

const WITH_IMAGES = { image: true, foreground: true } as const;

export type PublicHeroSegment = HeroSegment & {
  image: PublicMedia;
  foreground: PublicMedia | null;
};

@Injectable()
export class HeroService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async listActive(target: HeroTarget): Promise<PublicHeroSegment[]> {
    const rows = await this.prisma.heroSegment.findMany({
      where: { active: true, ...(target === "mobile" ? { showOnMobile: true } : {}) },
      orderBy: { sortOrder: "asc" },
      include: WITH_IMAGES,
    });
    return rows.map((r) => ({
      ...r,
      image: this.media.toPublic(r.image),
      foreground: this.media.view(r.foreground),
    }));
  }
```

Leave `listAll`, `create`, `update` and `remove` as they are — they are admin-side and Plan 1C will decide their shape.

`apps/api/src/content/services.service.ts` — same pattern:

```ts
const LIST_INCLUDE = { cover: true } as const;
const DETAIL_INCLUDE = { cover: true, gallery: true, seo: { include: { ogImage: true } } } as const;
```
```ts
  async listPublic() {
    const rows = await this.prisma.service.findMany({
      where: { published: true }, orderBy: PUBLIC_ORDER, include: LIST_INCLUDE,
    });
    return rows.map((r) => ({ ...r, cover: this.media.view(r.cover) }));
  }

  async findPublicBySlug(slug: string) {
    const row = await this.prisma.service.findFirst({
      where: { slug, published: true }, include: DETAIL_INCLUDE,
    });
    if (!row) return null;
    return {
      ...row,
      cover: this.media.view(row.cover),
      gallery: this.media.viewMany(row.gallery),
      seo: row.seo ? { ...row.seo, ogImage: this.media.view(row.seo.ogImage) } : null,
    };
  }
```

Apply the identical shape to:
- `projects.service.ts` — `LIST_INCLUDE = { cover: true }`, `DETAIL_INCLUDE = { cover: true, gallery: true, workingArea: true, seo: { include: { ogImage: true } } }`. Map `cover`, `gallery`, `seo`; pass `workingArea` through untouched.
- `blog.service.ts` — `LIST_INCLUDE = { cover: true }`, `DETAIL_INCLUDE = { cover: true, seo: { include: { ogImage: true } } }`. Map `cover` and `seo`. No gallery on this model.
- `testimonials.service.ts` — `listPublic` includes `{ avatar: true }`, maps `avatar: this.media.view(r.avatar)`.
- `team.service.ts` — `listPublic` includes `{ photo: true }`, maps `photo`.
- `certifications.service.ts` — `listPublic` includes `{ document: true }`, maps `document`.

Each of those services gains `private readonly media: MediaService` as a second constructor parameter.

`working-areas.service.ts`, `clients.service.ts` and `settings.service.ts` reference no media and are not touched.

- [ ] **Step 5: Run the e2e and watch it pass**

```bash
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @homeinn/api test:e2e
```
Expected: the whole e2e suite green — 87 passed, 3 todo, 6 suites. The three new tests are the delta.

- [ ] **Step 6: Confirm the existing unit specs still hold**

The services' unit specs construct the service with one argument. Add a stub second argument where the constructor changed:

```ts
const media = { view: () => null, viewMany: () => [], toPublic: (m: unknown) => m } as never;
```

```bash
pnpm --filter @homeinn/api test
pnpm typecheck
```
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat(api): return rendered media and seo on the public read surface"
```

---

## Task 3: Scaffold `apps/web`

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.ts`, `apps/web/postcss.config.mjs`, `apps/web/eslint.config.mjs`, `apps/web/vitest.config.ts`, `apps/web/vitest.setup.ts`, `apps/web/next-env.d.ts`
- Create: `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/app/globals.css`
- Create: `apps/web/lib/env.ts`, `apps/web/lib/env.test.ts`
- Modify: `.env.example`, `.env`

**Interfaces:**
- Produces: `apiBaseUrl(env?): string` and `siteUrl(env?): string` from `apps/web/lib/env.ts` — every other module reads the environment through these two functions and never touches `process.env` directly.

`app/page.tsx` here is a placeholder that Task 5 replaces with the `[locale]` tree. It exists so the scaffold is verifiably runnable on its own.

- [ ] **Step 1: Create the package manifest**

`apps/web/package.json`:

```json
{
  "name": "@homeinn/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start --port 3000",
    "lint": "eslint .",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@homeinn/types": "workspace:*",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@homeinn/config": "workspace:*",
    "@tailwindcss/postcss": "^4.0.0",
    "@testing-library/dom": "^10.4.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9.17.0",
    "eslint-config-next": "^15.1.0",
    "jsdom": "^25.0.1",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

```bash
pnpm install
```

- [ ] **Step 2: Configure TypeScript, Next, PostCSS, ESLint**

`apps/web/tsconfig.json` — the base is `NodeNext`, which Next cannot use; override the module resolution but keep the strictness:

```json
{
  "extends": "@homeinn/config/tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2023"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "allowJs": true,
    "noEmit": true,
    "declaration": false,
    "incremental": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "e2e"]
}
```

`apps/web/next.config.ts`:

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Images are already optimised by the API's sharp pipeline; see the plan's
  // global constraints. Nothing here goes through the Next loader.
  images: { unoptimized: true },
};

export default config;
```

`apps/web/postcss.config.mjs`:

```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

`apps/web/eslint.config.mjs`:

```js
import next from "eslint-config-next";

export default [
  ...next(),
  { ignores: [".next/**", "node_modules/**", "e2e/**"] },
];
```

`apps/web/next-env.d.ts`:

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 3: Configure Vitest**

`apps/web/vitest.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": resolve(__dirname, "./") } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["{app,components,hooks,lib}/**/*.test.{ts,tsx}"],
  },
});
```

`apps/web/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Write the failing test**

`apps/web/lib/env.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { apiBaseUrl, siteUrl } from "./env";

describe("apiBaseUrl", () => {
  it("defaults to the local API", () => {
    expect(apiBaseUrl({})).toBe("http://localhost:4000/api");
  });

  it("reads NEXT_PUBLIC_API_URL", () => {
    expect(apiBaseUrl({ NEXT_PUBLIC_API_URL: "https://api.homeinnbd.com/api" }))
      .toBe("https://api.homeinnbd.com/api");
  });

  it("strips trailing slashes so path joins never double up", () => {
    expect(apiBaseUrl({ NEXT_PUBLIC_API_URL: "https://api.homeinnbd.com/api//" }))
      .toBe("https://api.homeinnbd.com/api");
  });
});

describe("siteUrl", () => {
  it("defaults to the local dev origin", () => {
    expect(siteUrl({})).toBe("http://localhost:3000");
  });

  it("strips a trailing slash", () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://homeinnbd.com/" }))
      .toBe("https://homeinnbd.com");
  });
});
```

- [ ] **Step 5: Run it and watch it fail**

```bash
pnpm --filter @homeinn/web test
```
Expected: FAIL — `Failed to resolve import "./env"`.

- [ ] **Step 6: Implement**

`apps/web/lib/env.ts`:

```ts
type Env = Record<string, string | undefined>;

const strip = (url: string): string => url.replace(/\/+$/, "");

/**
 * Where the NestJS API lives. `NEXT_PUBLIC_` because the lead form posts from
 * the browser — see the plan's global constraints on the per-IP throttler.
 */
export function apiBaseUrl(env: Env = process.env): string {
  return strip(env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api");
}

/** The site's own origin. Canonical URLs, hreflang, sitemap and OG tags need it. */
export function siteUrl(env: Env = process.env): string {
  return strip(env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
}
```

- [ ] **Step 7: Run it and watch it pass**

```bash
pnpm --filter @homeinn/web test
```
Expected: PASS, 5 tests.

- [ ] **Step 8: Add a minimal renderable app**

`apps/web/app/globals.css`:

```css
@import "tailwindcss";
```

`apps/web/app/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`apps/web/app/page.tsx`:

```tsx
// Replaced by the [locale] tree in Task 5. Here so the scaffold is runnable.
export default function Page() {
  return <main>Home Inn</main>;
}
```

- [ ] **Step 9: Record the new environment variables**

Append to both `.env.example` and `.env`:

```
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
WEB_ORIGIN="http://localhost:3000"
```

`WEB_ORIGIN` is already read by `apps/api/src/main.ts` for CORS; it has been defaulting. Making it explicit keeps the browser's direct `POST /api/leads` working when the origin changes.

- [ ] **Step 10: Verify the whole toolchain**

```bash
pnpm --filter @homeinn/web build
pnpm --filter @homeinn/web lint
pnpm typecheck
pnpm test
```
Expected: build succeeds, lint reports no errors, typecheck clean, `pnpm test` now runs three packages.

- [ ] **Step 11: Commit**

```bash
git add apps/web .env.example
git commit -m "feat(web): scaffold the next.js app with vitest and eslint"
```

---

## Task 4: Design tokens, fonts, and the bilingual type scale

**Files:**
- Modify: `apps/web/app/globals.css`
- Create: `apps/web/lib/typography.ts`, `apps/web/lib/typography.test.ts`
- Create: `apps/web/app/theme.test.ts`
- Modify: `apps/web/app/layout.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `fontClassFor(locale: Locale): string` — `"font-sans"` for `en`, `"font-bangla"` for `bn`; goes on `<body>`.
  - CSS custom properties `--color-ink`, `--color-ink-raised`, `--color-ink-line`, `--color-bone`, `--color-sand`, `--color-sand-dim`, `--color-walnut`, `--color-amber`, `--color-brand`, giving Tailwind the utilities `bg-ink`, `text-sand`, `border-ink-line`, `text-brand`, …
  - The classes `.display-1`, `.display-2`, `.heading`, `.eyebrow` and `.section-numeral`, all scaled by `--type-scale`.

- [ ] **Step 1: Write the failing tests**

`apps/web/lib/typography.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { fontClassFor } from "./typography";

describe("fontClassFor", () => {
  it("uses the Latin stack for English", () => {
    expect(fontClassFor("en")).toBe("font-sans");
  });

  it("uses the Bangla stack for Bangla", () => {
    // Spec §9: the Bangla font must come from the server, so no flash of Latin.
    expect(fontClassFor("bn")).toBe("font-bangla");
  });
});
```

`apps/web/app/theme.test.ts` — a guard on the palette, which spec §8 fixes exactly:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "globals.css"), "utf8");

describe("the §8 palette", () => {
  const palette = {
    ink: "#0B0B0C", "ink-raised": "#141416", "ink-line": "#232326",
    bone: "#F6F2EC", sand: "#E7DFD2", "sand-dim": "#9C948A",
    walnut: "#7A5537", amber: "#C9A227", brand: "#E01B24",
  };

  for (const [token, value] of Object.entries(palette)) {
    it(`defines ${token} as ${value}`, () => {
      expect(css).toContain(`--color-${token}: ${value}`);
    });
  }

  it("scales Bangla headings to 0.94 of the Latin size", () => {
    expect(css).toMatch(/html\[lang="bn"\][^}]*--type-scale:\s*0\.94/);
  });
});
```

- [ ] **Step 2: Run and watch them fail**

```bash
pnpm --filter @homeinn/web test
```
Expected: FAIL — `./typography` unresolved, and every palette assertion fails.

- [ ] **Step 3: Write the theme**

Replace `apps/web/app/globals.css`:

```css
@import "tailwindcss";

/* packages/ui ships class names Tailwind must see; it is outside this app's tree. */
@source "../../../packages/ui/src";

@theme {
  /* Spec §8 — these nine values, verbatim. `brand` is CTA, active nav, focus
     ring and section numerals only; it is never a background wash. */
  --color-ink: #0B0B0C;
  --color-ink-raised: #141416;
  --color-ink-line: #232326;
  --color-bone: #F6F2EC;
  --color-sand: #E7DFD2;
  --color-sand-dim: #9C948A;
  --color-walnut: #7A5537;
  --color-amber: #C9A227;
  --color-brand: #E01B24;

  --font-display: var(--font-fraunces), Georgia, "Times New Roman", serif;
  --font-sans: var(--font-geist), system-ui, -apple-system, sans-serif;
  --font-bangla: var(--font-anek), "Noto Sans Bengali", system-ui, sans-serif;
}

@layer base {
  :root {
    /* Latin baseline. Bangla and Latin do not share an x-height, so the whole
       scale carries one per-locale adjustment rather than per-component tweaks. */
    --type-scale: 1;
    --heading-leading: 1.04;
    --body-leading: 1.65;
  }

  html[lang="bn"] {
    --type-scale: 0.94;
    --heading-leading: 1.42;
    --body-leading: 1.85;
  }

  body {
    background-color: var(--color-bone);
    color: var(--color-ink);
    line-height: var(--body-leading);
    -webkit-font-smoothing: antialiased;
  }

  :focus-visible {
    outline: 2px solid var(--color-brand);
    outline-offset: 3px;
  }

  ::selection {
    background-color: var(--color-brand);
    color: var(--color-bone);
  }
}

@layer components {
  .display-1 {
    font-family: var(--font-display);
    font-size: calc(var(--type-scale) * clamp(2.75rem, 7vw, 5.5rem));
    line-height: var(--heading-leading);
    letter-spacing: -0.02em;
    font-weight: 400;
  }

  .display-2 {
    font-family: var(--font-display);
    font-size: calc(var(--type-scale) * clamp(2rem, 4.5vw, 3.25rem));
    line-height: var(--heading-leading);
    letter-spacing: -0.015em;
    font-weight: 400;
  }

  .heading {
    font-family: var(--font-display);
    font-size: calc(var(--type-scale) * clamp(1.25rem, 2vw, 1.6rem));
    line-height: calc(var(--heading-leading) + 0.12);
    font-weight: 500;
  }

  .eyebrow {
    font-size: calc(var(--type-scale) * 0.75rem);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--color-sand-dim);
  }

  /* Spec §8 names section numerals as one of the four sanctioned uses of brand. */
  .section-numeral {
    font-family: var(--font-display);
    font-size: calc(var(--type-scale) * 0.8rem);
    color: var(--color-brand);
    letter-spacing: 0.1em;
  }
}
```

`text-transform: uppercase` is deliberately absent from `.eyebrow` when the page is Bangla — Bangla has no letter case, and the rule is a no-op there rather than a bug. Letter-spacing on Bangla conjuncts is not, so add immediately after the `.eyebrow` block:

```css
  html[lang="bn"] .eyebrow {
    letter-spacing: 0.04em;
  }
```

- [ ] **Step 4: Implement the font picker**

`apps/web/lib/typography.ts`:

```ts
import type { Locale } from "@homeinn/types";

/**
 * Which body font stack a locale renders in. Applied on `<body>` from the
 * server so a Bangla page never flashes the Latin fallback (spec §9).
 */
export function fontClassFor(locale: Locale): string {
  return locale === "bn" ? "font-bangla" : "font-sans";
}
```

- [ ] **Step 5: Load the three families**

Replace `apps/web/app/layout.tsx`:

```tsx
import { Anek_Bangla, Fraunces, Geist } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

const anek = Anek_Bangla({ subsets: ["bengali"], variable: "--font-anek", display: "swap" });

export const fontVariables = `${fraunces.variable} ${geist.variable} ${anek.variable}`;

// The [locale] layout owns <html lang> and <body>; this shell only carries the
// font variables so both locales resolve their stack on the server.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
```

Next requires a root layout to emit `<html>` and `<body>`. Since `[locale]/layout.tsx` (Task 5) does that, this file must not — so delete `apps/web/app/layout.tsx` in Task 5 and move `fontVariables` into `apps/web/lib/fonts.ts` at that point. For now, keep the file rendering `<html>`/`<body>` so the scaffold still runs:

```tsx
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Run the tests and the build**

```bash
pnpm --filter @homeinn/web test
pnpm --filter @homeinn/web build
```
Expected: 12 tests pass. The build needs network access the first time to fetch the three Google fonts; they are cached in `.next` afterwards.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): add the spec palette, type scale, and bilingual font stacks"
```

---

## Task 5: Locale routing with next-intl

**Files:**
- Create: `apps/web/i18n/routing.ts`, `apps/web/i18n/request.ts`, `apps/web/i18n/navigation.ts`
- Create: `apps/web/middleware.ts`
- Create: `apps/web/messages/en.json`, `apps/web/messages/bn.json`
- Create: `apps/web/messages/messages.test.ts`
- Create: `apps/web/lib/fonts.ts`
- Create: `apps/web/app/[locale]/layout.tsx`, `apps/web/app/[locale]/page.tsx`
- Delete: `apps/web/app/page.tsx`
- Modify: `apps/web/app/layout.tsx`, `apps/web/next.config.ts`

**Interfaces:**
- Consumes: `fontClassFor(locale)` from Task 4.
- Produces:
  - `routing` — `locales: ["en", "bn"]`, `defaultLocale: "en"`, `localePrefix: "always"`.
  - `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname` from `@/i18n/navigation` — **every internal link in this app uses this `Link`, never `next/link`**, so the locale prefix is never lost.
  - `fontVariables: string` from `@/lib/fonts`.
  - Message namespaces: `nav`, `common`, `home`, `about`, `services`, `projects`, `clients`, `blog`, `contact`, `form`, `seo`.

- [ ] **Step 1: Install**

```bash
pnpm --filter @homeinn/web add next-intl
```

- [ ] **Step 2: Write the failing test**

`apps/web/messages/messages.test.ts` — this is the guard against spec §9's stated failure mode:

```ts
import { describe, expect, it } from "vitest";
import en from "./en.json";
import bn from "./bn.json";

type Tree = { [k: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
}

const flatEn = flatten(en as Tree);
const flatBn = flatten(bn as Tree);

describe("message catalogues", () => {
  it("declare exactly the same keys", () => {
    expect(Object.keys(flatBn).sort()).toEqual(Object.keys(flatEn).sort());
  });

  it("never leave a Bangla string empty when the English one is written", () => {
    // Spec §9: a bn page silently falling back to English is the failure mode
    // this whole locale design exists to prevent. Blocked copy is empty in
    // BOTH catalogues (spec §12) and the section hides — that is allowed.
    const halfTranslated = Object.keys(flatEn).filter(
      (key) => flatEn[key]?.trim() !== "" && flatBn[key]?.trim() === "",
    );
    expect(halfTranslated).toEqual([]);
  });

  it("never leave English text sitting in the Bangla catalogue", () => {
    const untranslated = Object.entries(flatBn)
      .filter(([key, value]) => value.trim() !== "" && value === flatEn[key])
      // Proper nouns and numerals are identical in both catalogues by design.
      .filter(([key]) => !key.startsWith("common.brand") && !key.startsWith("common.social"));
    expect(untranslated).toEqual([]);
  });
});
```

- [ ] **Step 3: Run and watch it fail**

```bash
pnpm --filter @homeinn/web test -- messages
```
Expected: FAIL — cannot resolve `./en.json`.

- [ ] **Step 4: Write the catalogues**

`apps/web/messages/en.json`:

```json
{
  "common": {
    "brand": "Home Inn Interior Solution",
    "tagline": "touch your dream with us",
    "skipToContent": "Skip to content",
    "skipHero": "Skip the panorama",
    "whatsapp": "Chat on WhatsApp",
    "callUs": "Call us",
    "email": "Email",
    "address": "Address",
    "hours": "Hours",
    "social": "Home Inn",
    "readMore": "Read more",
    "viewAll": "View all",
    "since": "Since {year}",
    "loading": "Loading",
    "backHome": "Back to the home page"
  },
  "nav": {
    "home": "Home",
    "about": "About",
    "services": "Services",
    "projects": "Projects",
    "clients": "Clients",
    "blog": "Blog",
    "contact": "Contact",
    "menu": "Menu",
    "close": "Close",
    "language": "Language",
    "english": "English",
    "bangla": "বাংলা"
  },
  "home": {
    "heroCue": "Scroll to walk through",
    "heroFallbackTitle": "Interiors built to be lived in",
    "statementEyebrow": "Since 2015",
    "statementTitle": "Interior design, custom furniture, and project implementation across Bangladesh.",
    "statementBody": "Home Inn Interior Solution has designed, built and fitted out corporate offices, banks, resorts, showrooms and homes since 2015, working under the trade license of M/S Ahasan Enterprise.",
    "statCorporate": "corporate projects",
    "statResidential": "residential projects",
    "statDistricts": "districts",
    "servicesEyebrow": "What we do",
    "servicesTitle": "Seven ways we take a space from drawing to handover.",
    "areasEyebrow": "Where we work",
    "areasTitle": "Nine kinds of project, one standard of finish.",
    "projectsEyebrow": "Selected projects",
    "projectsTitle": "Recent work.",
    "trackRecordEyebrow": "Track record",
    "trackRecordTitle": "A decade of completed projects.",
    "trackRecordBody": "Corporate offices, banks, government departments, hospitals and homes — delivered and handed over.",
    "trackRecordCta": "See the full track record",
    "processEyebrow": "How we work",
    "processTitle": "",
    "testimonialsEyebrow": "In their words",
    "testimonialsTitle": "What clients say.",
    "credentialsEyebrow": "Credentials",
    "credentialsTitle": "Licensed, registered, and accountable.",
    "ctaEyebrow": "Free consultation",
    "ctaTitle": "Tell us about the space.",
    "ctaBody": "Send us the room, the budget range, and when you would like it finished. We will come back with what is possible."
  },
  "about": {
    "title": "About Home Inn",
    "storyEyebrow": "Our story",
    "storyBody": "Home Inn Interior Solution has operated in Bangladesh since 2015, under the trade license of M/S Ahasan Enterprise, delivering interior design, custom furniture and full project implementation for corporate and residential clients.",
    "visionTitle": "Vision",
    "visionBody": "",
    "missionTitle": "Mission",
    "missionBody": "",
    "valuesTitle": "Values",
    "valuesBody": "",
    "strengthsTitle": "Strengths",
    "strengthsBody": "",
    "philosophyTitle": "Philosophy",
    "philosophyBody": "",
    "credentialsTitle": "Credentials",
    "teamTitle": "The team"
  },
  "services": {
    "title": "Services",
    "intro": "Seven services, offered end to end.",
    "empty": "Services are being published. Please check back shortly.",
    "enquire": "Enquire about this service",
    "gallery": "Gallery"
  },
  "projects": {
    "title": "Projects",
    "intro": "Work filtered by the kind of space.",
    "all": "All projects",
    "empty": "Project case studies are being prepared and will be published once each client has confirmed the details.",
    "location": "Location",
    "area": "Area",
    "year": "Year",
    "client": "Client",
    "areaUnit": "sq ft",
    "filterLabel": "Filter by working area"
  },
  "clients": {
    "title": "Track record",
    "intro": "Completed projects for corporate, government and residential clients.",
    "corporateTitle": "Corporate and government projects",
    "corporateEmpty": "The full corporate project list is being prepared for publication.",
    "residentialTitle": "Residential projects",
    "residentialBody": "We publish residential work in aggregate. Individual homeowners are named only where they have asked us to.",
    "residentialCount": "{count} completed residential projects",
    "districtsTitle": "Districts we have worked in",
    "flagship": "Selected references"
  },
  "blog": {
    "title": "Journal",
    "intro": "Notes on interiors, materials and building in Bangladesh.",
    "empty": "The first posts are on the way.",
    "published": "Published {date}",
    "tags": "Tags"
  },
  "contact": {
    "title": "Contact",
    "intro": "Tell us about the project. We reply on WhatsApp or by phone.",
    "detailsTitle": "Studio",
    "formTitle": "Send an enquiry"
  },
  "form": {
    "name": "Your name",
    "phone": "Mobile number",
    "phoneHint": "A Bangladeshi mobile number, for example 01760775454",
    "email": "Email (optional)",
    "service": "Service you are interested in",
    "servicePlaceholder": "No particular service",
    "message": "What would you like done?",
    "type": "What do you need?",
    "typeContact": "General enquiry",
    "typeConsultation": "Free consultation",
    "typeQuote": "A quotation",
    "submit": "Send enquiry",
    "submitting": "Sending",
    "success": "Thank you. We have your enquiry and will call you back.",
    "errorGeneric": "Something went wrong. Please try again, or reach us on WhatsApp.",
    "errorPhone": "Please enter a valid Bangladeshi mobile number.",
    "errorName": "Please tell us your name.",
    "errorThrottled": "That is several enquiries from this connection in a short time. Please call or message us on WhatsApp instead.",
    "required": "Required"
  },
  "seo": {
    "defaultTitle": "Home Inn Interior Solution — Interior design and custom furniture in Bangladesh",
    "defaultDescription": "Interior design, custom furniture and project implementation across Bangladesh since 2015. 73 corporate projects delivered.",
    "titleTemplate": "{page} — Home Inn Interior Solution"
  },
  "errors": {
    "notFoundTitle": "That page does not exist",
    "notFoundBody": "The link may be out of date. Everything else is still where it was.",
    "errorTitle": "Something broke on our side",
    "errorBody": "Please try again. If it keeps happening, message us on WhatsApp.",
    "retry": "Try again"
  }
}
```

`apps/web/messages/bn.json` — the same keys, Bangla text, and the same five deliberately-empty `about` bodies plus `home.processTitle`:

```json
{
  "common": {
    "brand": "Home Inn Interior Solution",
    "tagline": "আপনার স্বপ্ন ছোঁয়া আমাদের স্পর্শ",
    "skipToContent": "মূল অংশে যান",
    "skipHero": "প্যানোরামা এড়িয়ে যান",
    "whatsapp": "হোয়াটসঅ্যাপে বার্তা দিন",
    "callUs": "ফোন করুন",
    "email": "ইমেইল",
    "address": "ঠিকানা",
    "hours": "সময়",
    "social": "Home Inn",
    "readMore": "বিস্তারিত",
    "viewAll": "সব দেখুন",
    "since": "{year} সাল থেকে",
    "loading": "লোড হচ্ছে",
    "backHome": "হোম পেজে ফিরুন"
  },
  "nav": {
    "home": "হোম",
    "about": "পরিচিতি",
    "services": "সেবা",
    "projects": "প্রকল্প",
    "clients": "ক্লায়েন্ট",
    "blog": "ব্লগ",
    "contact": "যোগাযোগ",
    "menu": "মেনু",
    "close": "বন্ধ করুন",
    "language": "ভাষা",
    "english": "English",
    "bangla": "বাংলা"
  },
  "home": {
    "heroCue": "স্ক্রল করে ঘুরে দেখুন",
    "heroFallbackTitle": "বসবাসের জন্য তৈরি ইন্টেরিয়র",
    "statementEyebrow": "২০১৫ সাল থেকে",
    "statementTitle": "সারা বাংলাদেশে ইন্টেরিয়র ডিজাইন, কাস্টম ফার্নিচার ও প্রকল্প বাস্তবায়ন।",
    "statementBody": "২০১৫ সাল থেকে হোম ইন ইন্টেরিয়র সলিউশন কর্পোরেট অফিস, ব্যাংক, রিসোর্ট, শোরুম ও বাসাবাড়ির ডিজাইন, নির্মাণ ও সাজসজ্জার কাজ করে আসছে — M/S Ahasan Enterprise-এর ট্রেড লাইসেন্সের অধীনে।",
    "statCorporate": "কর্পোরেট প্রকল্প",
    "statResidential": "আবাসিক প্রকল্প",
    "statDistricts": "জেলা",
    "servicesEyebrow": "আমরা যা করি",
    "servicesTitle": "ড্রয়িং থেকে হস্তান্তর পর্যন্ত — সাতটি সেবা।",
    "areasEyebrow": "যেখানে কাজ করি",
    "areasTitle": "নয় ধরনের প্রকল্প, একই মানের ফিনিশিং।",
    "projectsEyebrow": "নির্বাচিত প্রকল্প",
    "projectsTitle": "সাম্প্রতিক কাজ।",
    "trackRecordEyebrow": "কাজের রেকর্ড",
    "trackRecordTitle": "এক দশকের সম্পন্ন প্রকল্প।",
    "trackRecordBody": "কর্পোরেট অফিস, ব্যাংক, সরকারি দপ্তর, হাসপাতাল ও বাসাবাড়ি — সম্পন্ন করে হস্তান্তর করা হয়েছে।",
    "trackRecordCta": "পুরো রেকর্ড দেখুন",
    "processEyebrow": "আমরা যেভাবে কাজ করি",
    "processTitle": "",
    "testimonialsEyebrow": "তাঁদের ভাষায়",
    "testimonialsTitle": "ক্লায়েন্টরা যা বলেন।",
    "credentialsEyebrow": "সনদপত্র",
    "credentialsTitle": "লাইসেন্সপ্রাপ্ত, নিবন্ধিত ও জবাবদিহিমূলক।",
    "ctaEyebrow": "বিনামূল্যে পরামর্শ",
    "ctaTitle": "আপনার জায়গাটির কথা বলুন।",
    "ctaBody": "কোন ঘর, কেমন বাজেট আর কবের মধ্যে শেষ করতে চান — জানান। কী করা সম্ভব, আমরা জানিয়ে দেব।"
  },
  "about": {
    "title": "হোম ইন সম্পর্কে",
    "storyEyebrow": "আমাদের গল্প",
    "storyBody": "২০১৫ সাল থেকে হোম ইন ইন্টেরিয়র সলিউশন বাংলাদেশে কাজ করছে — M/S Ahasan Enterprise-এর ট্রেড লাইসেন্সের অধীনে কর্পোরেট ও আবাসিক ক্লায়েন্টদের জন্য ইন্টেরিয়র ডিজাইন, কাস্টম ফার্নিচার ও সম্পূর্ণ প্রকল্প বাস্তবায়ন করছে।",
    "visionTitle": "ভিশন",
    "visionBody": "",
    "missionTitle": "মিশন",
    "missionBody": "",
    "valuesTitle": "মূল্যবোধ",
    "valuesBody": "",
    "strengthsTitle": "শক্তির জায়গা",
    "strengthsBody": "",
    "philosophyTitle": "দর্শন",
    "philosophyBody": "",
    "credentialsTitle": "সনদপত্র",
    "teamTitle": "আমাদের দল"
  },
  "services": {
    "title": "সেবাসমূহ",
    "intro": "শুরু থেকে শেষ পর্যন্ত সাতটি সেবা।",
    "empty": "সেবার তালিকা প্রকাশ করা হচ্ছে। একটু পরে আবার দেখুন।",
    "enquire": "এই সেবা সম্পর্কে জানতে চাই",
    "gallery": "গ্যালারি"
  },
  "projects": {
    "title": "প্রকল্প",
    "intro": "জায়গার ধরন অনুযায়ী কাজ।",
    "all": "সব প্রকল্প",
    "empty": "প্রকল্পের বিস্তারিত প্রস্তুত করা হচ্ছে; প্রতিটি ক্লায়েন্টের নিশ্চিতকরণের পর প্রকাশ করা হবে।",
    "location": "অবস্থান",
    "area": "আয়তন",
    "year": "সাল",
    "client": "ক্লায়েন্ট",
    "areaUnit": "বর্গফুট",
    "filterLabel": "কাজের ক্ষেত্র অনুযায়ী বাছুন"
  },
  "clients": {
    "title": "কাজের রেকর্ড",
    "intro": "কর্পোরেট, সরকারি ও আবাসিক ক্লায়েন্টদের জন্য সম্পন্ন প্রকল্প।",
    "corporateTitle": "কর্পোরেট ও সরকারি প্রকল্প",
    "corporateEmpty": "সম্পূর্ণ কর্পোরেট প্রকল্প তালিকা প্রকাশের জন্য প্রস্তুত করা হচ্ছে।",
    "residentialTitle": "আবাসিক প্রকল্প",
    "residentialBody": "আবাসিক কাজ আমরা সামষ্টিকভাবে প্রকাশ করি। কোনো বাড়ির মালিকের নাম কেবল তাঁর অনুরোধেই উল্লেখ করা হয়।",
    "residentialCount": "{count}টি সম্পন্ন আবাসিক প্রকল্প",
    "districtsTitle": "যেসব জেলায় কাজ হয়েছে",
    "flagship": "উল্লেখযোগ্য কাজ"
  },
  "blog": {
    "title": "জার্নাল",
    "intro": "ইন্টেরিয়র, উপকরণ ও বাংলাদেশে নির্মাণ নিয়ে লেখা।",
    "empty": "প্রথম লেখাগুলো শিগগিরই আসছে।",
    "published": "{date} তারিখে প্রকাশিত",
    "tags": "ট্যাগ"
  },
  "contact": {
    "title": "যোগাযোগ",
    "intro": "প্রকল্পের কথা জানান। আমরা হোয়াটসঅ্যাপে বা ফোনে উত্তর দিই।",
    "detailsTitle": "স্টুডিও",
    "formTitle": "বার্তা পাঠান"
  },
  "form": {
    "name": "আপনার নাম",
    "phone": "মোবাইল নম্বর",
    "phoneHint": "বাংলাদেশি মোবাইল নম্বর, যেমন ০১৭৬০৭৭৫৪৫৪",
    "email": "ইমেইল (ঐচ্ছিক)",
    "service": "যে সেবায় আগ্রহী",
    "servicePlaceholder": "নির্দিষ্ট কোনো সেবা নয়",
    "message": "কী কাজ করাতে চান?",
    "type": "আপনার কী প্রয়োজন?",
    "typeContact": "সাধারণ জিজ্ঞাসা",
    "typeConsultation": "বিনামূল্যে পরামর্শ",
    "typeQuote": "কোটেশন",
    "submit": "পাঠান",
    "submitting": "পাঠানো হচ্ছে",
    "success": "ধন্যবাদ। আপনার বার্তা পেয়েছি, আমরা ফোন করব।",
    "errorGeneric": "কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন, অথবা হোয়াটসঅ্যাপে যোগাযোগ করুন।",
    "errorPhone": "সঠিক বাংলাদেশি মোবাইল নম্বর দিন।",
    "errorName": "আপনার নাম লিখুন।",
    "errorThrottled": "এই সংযোগ থেকে অল্প সময়ে কয়েকটি বার্তা এসেছে। অনুগ্রহ করে ফোন করুন বা হোয়াটসঅ্যাপে লিখুন।",
    "required": "আবশ্যক"
  },
  "seo": {
    "defaultTitle": "হোম ইন ইন্টেরিয়র সলিউশন — বাংলাদেশে ইন্টেরিয়র ডিজাইন ও কাস্টম ফার্নিচার",
    "defaultDescription": "২০১৫ সাল থেকে সারা বাংলাদেশে ইন্টেরিয়র ডিজাইন, কাস্টম ফার্নিচার ও প্রকল্প বাস্তবায়ন। ৭৩টি কর্পোরেট প্রকল্প সম্পন্ন।",
    "titleTemplate": "{page} — হোম ইন ইন্টেরিয়র সলিউশন"
  },
  "errors": {
    "notFoundTitle": "এই পেজটি নেই",
    "notFoundBody": "লিংকটি পুরনো হতে পারে। বাকি সব আগের জায়গাতেই আছে।",
    "errorTitle": "আমাদের দিকে কিছু একটা ভেঙেছে",
    "errorBody": "আবার চেষ্টা করুন। বারবার হলে হোয়াটসঅ্যাপে জানান।",
    "retry": "আবার চেষ্টা করুন"
  }
}
```

The six empty strings — `about.visionBody`, `about.missionBody`, `about.valuesBody`, `about.strengthsBody`, `about.philosophyBody` and `home.processTitle` — are empty in **both** catalogues on purpose. Their source is the company profile PDF's Vision/Mission/Values/Strengths/Philosophy blocks and the six key strengths, and that document is not in this repository. Spec §12 forbids inventing them, so the sections that read them hide until the text lands. This is the same decision Plan 1A Task 14 made for the client tables.

- [ ] **Step 5: Run and watch the catalogue test pass**

```bash
pnpm --filter @homeinn/web test -- messages
```
Expected: PASS, 3 tests.

- [ ] **Step 6: Wire next-intl**

`apps/web/i18n/routing.ts`:

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "bn"],
  defaultLocale: "en",
  // Spec §9: locale is a route segment on every page, including the default,
  // so each language is independently indexable and has a stable canonical URL.
  localePrefix: "always",
  localeDetection: true,
});
```

`apps/web/i18n/navigation.ts`:

```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Use this `Link` everywhere. `next/link` would drop the locale prefix. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
```

`apps/web/i18n/request.ts`:

```ts
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

`apps/web/middleware.ts`:

```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Everything except Next internals and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

`apps/web/next.config.ts` — wrap the config:

```ts
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const config: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default withNextIntl(config);
```

- [ ] **Step 7: Move the layout under `[locale]`**

`apps/web/lib/fonts.ts`:

```ts
import { Anek_Bangla, Fraunces, Geist } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"], variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"], display: "swap",
});
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const anek = Anek_Bangla({ subsets: ["bengali"], variable: "--font-anek", display: "swap" });

export const fontVariables = `${fraunces.variable} ${geist.variable} ${anek.variable}`;
```

Delete `apps/web/app/page.tsx`. Replace `apps/web/app/layout.tsx` with a pass-through:

```tsx
import type { ReactNode } from "react";

// `[locale]/layout.tsx` renders <html> and <body>; this shell only exists
// because the App Router requires a root layout.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
```

`apps/web/app/[locale]/layout.tsx`:

```tsx
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { routing } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import { fontClassFor } from "@/lib/typography";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={fontVariables}>
      <body className={fontClassFor(locale)}>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

`apps/web/app/[locale]/page.tsx` — a placeholder that Tasks 11–12 fill in:

```tsx
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");

  return (
    <main className="p-8">
      <h1 className="display-1">{t("brand")}</h1>
      <p className="eyebrow">{t("tagline")}</p>
    </main>
  );
}
```

- [ ] **Step 8: Verify both locales render**

```bash
pnpm --filter @homeinn/web build
pnpm --filter @homeinn/web dev
```
Then, in another shell:
```bash
curl -s localhost:3000/en | grep -o 'lang="en"'
curl -s localhost:3000/bn | grep -o 'lang="bn"'
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' localhost:3000/
```
Expected: `lang="en"`, `lang="bn"`, and `/` returning a 307 to `/en`. Stop the dev server.

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat(web): add locale routing, message catalogues, and the locale layout"
```

---

## Task 6: `packages/ui` — primitives and the marquee

**Files:**
- Create: `packages/ui/package.json`, `packages/ui/tsconfig.json`, `packages/ui/components.json`
- Create: `packages/ui/src/lib/utils.ts`
- Create: `packages/ui/src/components/ui/{button,input,textarea,label,sheet}.tsx` (via the shadcn CLI)
- Create: `packages/ui/src/components/marquee.tsx`, `packages/ui/src/components/marquee.test.tsx`
- Create: `packages/ui/src/index.ts`
- Modify: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/vitest.config.ts`

**Interfaces:**
- Consumes: the Tailwind theme from Task 4 — `packages/ui` ships class names only; `apps/web/app/globals.css` already `@source`s this directory.
- Produces, from `@homeinn/ui`:
  - `cn(...inputs: ClassValue[]): string`
  - `Button` (`variant`: `"solid" | "outline" | "ghost"`, `size`: `"sm" | "md" | "lg"`)
  - `Input`, `Textarea`, `Label`
  - `Sheet`, `SheetTrigger`, `SheetContent`, `SheetTitle`, `SheetClose` — the mobile nav
  - `Marquee` — `{ speedSeconds?: number; children: ReactNode }`, paused under `prefers-reduced-motion`

- [ ] **Step 1: Create the package**

`packages/ui/package.json`:

```json
{
  "name": "@homeinn/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./*": "./src/*"
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-slot": "^1.1.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.469.0",
    "tailwind-merge": "^2.6.0"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@homeinn/config": "workspace:*",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

`packages/ui/tsconfig.json`:

```json
{
  "extends": "@homeinn/config/tsconfig.base.json",
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "noEmit": true,
    "declaration": false,
    "lib": ["dom", "dom.iterable", "ES2023"],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*"]
}
```

`packages/ui/components.json` — tells the shadcn CLI where things go:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "../../apps/web/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

`packages/ui/src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

```bash
pnpm install
```

- [ ] **Step 2: Pull the primitives**

```bash
cd packages/ui && pnpm dlx shadcn@latest add button input textarea label sheet
```

The CLI writes into `packages/ui/src/components/ui/`. It may append `@theme`/`:root` colour variables to `apps/web/app/globals.css` — **revert any change it makes to the nine `--color-*` tokens from Task 4**; the `theme.test.ts` guard from Task 4 will fail if it overwrites them. Keep any `--radius` it adds.

Then restyle `button.tsx`'s variants to the §8 palette, replacing the generated `default`/`destructive`/`outline`/`secondary`/`ghost`/`link` set with three:

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
  {
    variants: {
      variant: {
        solid: "bg-brand text-bone hover:bg-brand/90",
        outline: "border border-current bg-transparent hover:bg-current/5",
        ghost: "bg-transparent hover:bg-current/5",
      },
      size: {
        sm: "h-9 px-4",
        md: "h-11 px-6",
        lg: "h-14 px-8 text-base",
      },
    },
    defaultVariants: { variant: "solid", size: "md" },
  },
);
```

`rounded-none` is deliberate: §8's direction is cinematic and quiet, and square edges read as architectural rather than as a web app.

- [ ] **Step 3: Write the failing marquee test**

`packages/ui/src/components/marquee.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Marquee } from "./marquee";

describe("Marquee", () => {
  it("renders its children", () => {
    render(<Marquee><span>BFIDC</span></Marquee>);
    expect(screen.getByText("BFIDC")).toBeInTheDocument();
  });

  it("duplicates the track so the loop has no gap", () => {
    const { container } = render(<Marquee><span>BFIDC</span></Marquee>);
    expect(container.querySelectorAll("[data-marquee-track]")).toHaveLength(2);
  });

  it("hides the duplicate from assistive technology", () => {
    const { container } = render(<Marquee><span>BFIDC</span></Marquee>);
    const tracks = container.querySelectorAll("[data-marquee-track]");
    expect(tracks[1]).toHaveAttribute("aria-hidden", "true");
  });

  it("takes its duration from the speed prop", () => {
    const { container } = render(<Marquee speedSeconds={40}><span>x</span></Marquee>);
    expect(container.firstElementChild).toHaveStyle({ "--marquee-duration": "40s" });
  });
});
```

- [ ] **Step 4: Add the vitest config and run it**

`packages/ui/vitest.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": resolve(__dirname, "./src") } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

`packages/ui/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

```bash
pnpm --filter @homeinn/ui test
```
Expected: FAIL — `./marquee` unresolved.

- [ ] **Step 5: Implement the marquee**

`packages/ui/src/components/marquee.tsx`:

```tsx
import type { CSSProperties, ReactNode } from "react";
import { cn } from "../lib/utils";

interface MarqueeProps {
  children: ReactNode;
  /** One full pass of the track, in seconds. Slower reads as calmer. */
  speedSeconds?: number;
  className?: string;
}

/**
 * A CSS-only horizontal loop. The track is rendered twice so the seam falls
 * outside the viewport; the copy is aria-hidden so a screen reader hears the
 * list once. Animation stops entirely under prefers-reduced-motion, leaving a
 * static, horizontally scrollable row.
 */
export function Marquee({ children, speedSeconds = 45, className }: MarqueeProps) {
  return (
    <div
      className={cn("group relative flex overflow-x-auto motion-safe:overflow-hidden", className)}
      style={{ "--marquee-duration": `${speedSeconds}s` } as CSSProperties}
    >
      <div
        data-marquee-track
        className="flex shrink-0 items-center gap-12 pr-12 motion-safe:animate-[marquee_var(--marquee-duration)_linear_infinite] motion-safe:group-hover:[animation-play-state:paused]"
      >
        {children}
      </div>
      <div
        data-marquee-track
        aria-hidden="true"
        className="hidden shrink-0 items-center gap-12 pr-12 motion-safe:flex motion-safe:animate-[marquee_var(--marquee-duration)_linear_infinite] motion-safe:group-hover:[animation-play-state:paused]"
      >
        {children}
      </div>
    </div>
  );
}
```

Add the keyframes to `apps/web/app/globals.css`, inside the `@theme` block:

```css
  --animate-marquee: marquee var(--marquee-duration, 45s) linear infinite;

  @keyframes marquee {
    from { transform: translateX(0); }
    to { transform: translateX(-100%); }
  }
```

- [ ] **Step 6: Export the surface**

`packages/ui/src/index.ts`:

```ts
export { cn } from "./lib/utils";
export { Button, buttonVariants } from "./components/ui/button";
export { Input } from "./components/ui/input";
export { Textarea } from "./components/ui/textarea";
export { Label } from "./components/ui/label";
export {
  Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger,
} from "./components/ui/sheet";
export { Marquee } from "./components/marquee";
```

- [ ] **Step 7: Consume it from the web app**

`apps/web/package.json` — add to `dependencies`:

```json
    "@homeinn/ui": "workspace:*",
    "lucide-react": "^0.469.0",
```

`apps/web/next.config.ts` — `@homeinn/ui` ships TypeScript source:

```ts
const config: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  transpilePackages: ["@homeinn/ui"],
};
```

`apps/web/vitest.config.ts` — resolve the workspace source in tests:

```ts
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
      "@homeinn/ui": resolve(__dirname, "../../packages/ui/src"),
    },
  },
```

```bash
pnpm install
```

- [ ] **Step 8: Run everything**

```bash
pnpm --filter @homeinn/ui test
pnpm --filter @homeinn/web test
pnpm --filter @homeinn/web build
pnpm typecheck
```
Expected: 4 UI tests pass, web tests still pass, build succeeds.

- [ ] **Step 9: Commit**

```bash
git add packages/ui apps/web pnpm-lock.yaml
git commit -m "feat(ui): add shared primitives and a css marquee"
```
---

## Task 7: The data layer — API client, locale text, media helpers

**Files:**
- Create: `apps/web/lib/api.ts`, `apps/web/lib/api.test.ts`
- Create: `apps/web/lib/api.types.ts`
- Create: `apps/web/lib/content.ts`
- Create: `apps/web/lib/locale-text.ts`, `apps/web/lib/locale-text.test.ts`
- Create: `apps/web/lib/media.ts`, `apps/web/lib/media.test.ts`
- Create: `apps/web/components/media/picture.tsx`, `apps/web/components/media/picture.test.tsx`
- Modify: `apps/web/vitest.setup.ts`

**Interfaces:**
- Consumes: `apiBaseUrl()` from Task 3; `PublicMedia` and `Locale` from `@homeinn/types`.
- Produces:
  - `apiGet<T>(path, opts?): Promise<T>` — throws `ApiError` on a non-2xx
  - `apiGetOrNull<T>(path, opts?): Promise<T | null>` — 404 becomes `null`
  - `apiGetOr<T>(path, fallback, opts?): Promise<T>` — any failure becomes the fallback
  - `class ApiError extends Error { status: number }`
  - `lib/content.ts`: `getSettings`, `getServices`, `getService(slug)`, `getWorkingAreas`, `getProjects(areaSlug?)`, `getProject(slug)`, `getHero(target)`, `getBlogPosts`, `getBlogPost(slug)`, `getTestimonials`, `getTeam`, `getCertifications`, `getCorporateClients`, `getResidentialSummary`
  - `text(row, field, locale): string` and `textOrNull(row, field, locale): string | null`
  - `largestSrc(srcset): string`, `blurhashAverageColor(hash): string`, `PLACEHOLDER_COLOR`
  - `<Picture media sizes priority className />`

Response *shapes* are declared as TypeScript types here rather than as Zod schemas in `@homeinn/types`. `@homeinn/types` holds request DTOs, which both sides genuinely validate; response shapes come straight from Prisma rows, and a second hand-written definition of them would be a source of truth that can drift from the schema without anything failing. The contract is enforced instead by `apps/api/test/public-api.e2e-spec.ts`, which asserts the real payloads.

- [ ] **Step 1: Write the failing tests**

`apps/web/lib/locale-text.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { text, textOrNull } from "./locale-text";

const row = {
  titleEn: "Living Room", titleBn: "বসার ঘর",
  captionEn: null, captionBn: "ক্যাপশন",
};

describe("text", () => {
  it("returns the English field for en", () => {
    expect(text(row, "title", "en")).toBe("Living Room");
  });

  it("returns the Bangla field for bn", () => {
    expect(text(row, "title", "bn")).toBe("বসার ঘর");
  });

  it("never falls back across languages", () => {
    // Spec §9: a bn page showing English is the failure this design prevents.
    // The API's bilingualText schema guarantees both columns are non-empty, so
    // an empty Bangla string is a data bug that must stay visible, not be masked.
    expect(text({ titleEn: "Only English", titleBn: "" }, "title", "bn")).toBe("");
  });
});

describe("textOrNull", () => {
  it("passes nulls through", () => {
    expect(textOrNull(row, "caption", "en")).toBeNull();
    expect(textOrNull(row, "caption", "bn")).toBe("ক্যাপশন");
  });
});
```

`apps/web/lib/media.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { blurhashAverageColor, largestSrc, PLACEHOLDER_COLOR } from "./media";

const B83 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";

/** The test writes its own base83 encoder so the expectation is independent. */
function encode83(value: number, length: number): string {
  let out = "";
  for (let i = 1; i <= length; i++) {
    const digit = Math.floor(value / 83 ** (length - i)) % 83;
    out += B83[digit];
  }
  return out;
}

const hashFor = (rgb: number): string => `L${B83[9]}${encode83(rgb, 4)}${"0".repeat(23)}`;

describe("largestSrc", () => {
  it("returns the URL of the widest candidate", () => {
    expect(largestSrc("http://cdn/a/480.webp 480w, http://cdn/a/1920.webp 1920w"))
      .toBe("http://cdn/a/1920.webp");
  });

  it("does not assume the candidates are sorted", () => {
    expect(largestSrc("http://cdn/a/1920.webp 1920w, http://cdn/a/480.webp 480w"))
      .toBe("http://cdn/a/1920.webp");
  });

  it("returns an empty string for an empty srcset", () => {
    expect(largestSrc("")).toBe("");
  });
});

describe("blurhashAverageColor", () => {
  it("decodes the DC component to a hex colour", () => {
    expect(blurhashAverageColor(hashFor(0x336699))).toBe("#336699");
  });

  it("pads short channel values", () => {
    expect(blurhashAverageColor(hashFor(0x000102))).toBe("#000102");
  });

  it("falls back for a missing hash", () => {
    expect(blurhashAverageColor(null)).toBe(PLACEHOLDER_COLOR);
    expect(blurhashAverageColor(undefined)).toBe(PLACEHOLDER_COLOR);
  });

  it("falls back for a malformed hash rather than throwing", () => {
    expect(blurhashAverageColor("!!")).toBe(PLACEHOLDER_COLOR);
    expect(blurhashAverageColor("L««««000000000000000000000000")).toBe(PLACEHOLDER_COLOR);
  });
});
```

`apps/web/lib/api.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiGet, apiGetOr, apiGetOrNull } from "./api";

function stubFetch(status: number, body: unknown) {
  const spy = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => vi.unstubAllGlobals());

describe("apiGet", () => {
  it("requests the path against the configured base", async () => {
    const spy = stubFetch(200, { ok: true });
    await apiGet("/services");
    expect(spy.mock.calls[0]?.[0]).toBe("http://localhost:4000/api/services");
  });

  it("returns the parsed body", async () => {
    stubFetch(200, [{ slug: "a" }]);
    await expect(apiGet("/services")).resolves.toEqual([{ slug: "a" }]);
  });

  it("throws an ApiError carrying the status", async () => {
    stubFetch(500, {});
    await expect(apiGet("/services")).rejects.toBeInstanceOf(ApiError);
    await expect(apiGet("/services")).rejects.toMatchObject({ status: 500 });
  });
});

describe("apiGetOrNull", () => {
  it("turns a 404 into null", async () => {
    stubFetch(404, {});
    await expect(apiGetOrNull("/services/nope")).resolves.toBeNull();
  });

  it("still throws on a 500 — a broken API is not a missing page", async () => {
    stubFetch(500, {});
    await expect(apiGetOrNull("/services/x")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("apiGetOr", () => {
  it("returns the fallback when the call fails", async () => {
    stubFetch(503, {});
    await expect(apiGetOr("/testimonials", [])).resolves.toEqual([]);
  });
});
```

- [ ] **Step 2: Run and watch them fail**

```bash
pnpm --filter @homeinn/web test
```
Expected: FAIL — none of `./locale-text`, `./media`, `./api` resolve.

- [ ] **Step 3: Implement `lib/locale-text.ts`**

```ts
import type { Locale } from "@homeinn/types";

type Bilingual<F extends string> = Record<`${F}En` | `${F}Bn`, string>;
type BilingualOptional<F extends string> = Record<`${F}En` | `${F}Bn`, string | null>;

/**
 * Picks the `<field>En` / `<field>Bn` column for the active locale.
 *
 * There is deliberately no cross-language fallback: spec §9's stated failure
 * mode is a Bangla page quietly rendering English, and the API already refuses
 * to store a half-filled pair.
 */
export function text<F extends string>(row: Bilingual<F>, field: F, locale: Locale): string {
  const key = (locale === "bn" ? `${field}Bn` : `${field}En`) as keyof Bilingual<F>;
  return row[key];
}

/** The same, for nullable pairs such as `captionEn` / `captionBn`. */
export function textOrNull<F extends string>(
  row: BilingualOptional<F>,
  field: F,
  locale: Locale,
): string | null {
  const key = (locale === "bn" ? `${field}Bn` : `${field}En`) as keyof BilingualOptional<F>;
  return row[key];
}
```

- [ ] **Step 4: Implement `lib/media.ts`**

```ts
const BASE83 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";

/** `ink-raised` — the ground an image sits on before it has decoded. */
export const PLACEHOLDER_COLOR = "#141416";

function decode83(chars: string): number {
  let value = 0;
  for (const char of chars) {
    const digit = BASE83.indexOf(char);
    if (digit < 0) return -1;
    value = value * 83 + digit;
  }
  return value;
}

/**
 * The average colour a blurhash encodes, as `#rrggbb`.
 *
 * Characters 2–6 of a blurhash are the base83-encoded 24-bit sRGB DC component,
 * so the average is readable without decoding the AC components or touching a
 * canvas. That keeps the placeholder server-renderable — which matters, because
 * the first hero segment is the LCP element (spec §7).
 */
export function blurhashAverageColor(hash: string | null | undefined): string {
  if (!hash || hash.length < 6) return PLACEHOLDER_COLOR;
  const dc = decode83(hash.slice(2, 6));
  if (dc < 0) return PLACEHOLDER_COLOR;
  return `#${(dc & 0xffffff).toString(16).padStart(6, "0")}`;
}

/** The URL of the widest candidate in a srcset, for the `<img>` fallback `src`. */
export function largestSrc(srcset: string): string {
  let best = "";
  let bestWidth = -1;
  for (const candidate of srcset.split(",")) {
    const [url, descriptor] = candidate.trim().split(/\s+/);
    if (!url) continue;
    const width = Number.parseInt(descriptor ?? "0", 10) || 0;
    if (width > bestWidth) {
      bestWidth = width;
      best = url;
    }
  }
  return best;
}
```

- [ ] **Step 5: Implement `lib/api.ts`**

```ts
import { apiBaseUrl } from "./env";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface FetchOptions {
  /** Seconds. Content changes when an editor publishes, so five minutes is ample. */
  revalidate?: number;
  /** Cache tags, so Plan 1C's admin can revalidate a single resource on publish. */
  tags?: string[];
}

export async function apiGet<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    headers: { accept: "application/json" },
    next: { revalidate: options.revalidate ?? 300, tags: options.tags },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} responded ${response.status}`);
  }
  return (await response.json()) as T;
}

/** For detail routes: a 404 is a missing page, anything else is still an outage. */
export async function apiGetOrNull<T>(path: string, options?: FetchOptions): Promise<T | null> {
  try {
    return await apiGet<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/**
 * For optional sections only — testimonials, team, the corporate table. These
 * hide when empty anyway (spec §12), so an API hiccup should shrink the page
 * rather than take the whole home route down.
 */
export async function apiGetOr<T>(path: string, fallback: T, options?: FetchOptions): Promise<T> {
  try {
    return await apiGet<T>(path, options);
  } catch {
    return fallback;
  }
}
```

- [ ] **Step 6: Run and watch them pass**

```bash
pnpm --filter @homeinn/web test
```
Expected: PASS — 4 locale-text, 7 media, 6 api tests.

- [ ] **Step 7: Declare the response shapes**

`apps/web/lib/api.types.ts`:

```ts
import type { PublicMedia } from "@homeinn/types";

/** Over the wire, `createdAt` is an ISO string, not a Date. */
export type MediaView = Omit<PublicMedia, "createdAt"> & { createdAt: string };

export interface SeoView {
  titleEn: string | null;
  titleBn: string | null;
  descriptionEn: string | null;
  descriptionBn: string | null;
  ogImage: MediaView | null;
}

export interface ServiceView {
  id: string;
  slug: string;
  titleEn: string; titleBn: string;
  summaryEn: string; summaryBn: string;
  bodyEn: string; bodyBn: string;
  icon: string;
  sortOrder: number;
  published: boolean;
  cover: MediaView | null;
}
export type ServiceDetailView = ServiceView & { gallery: MediaView[]; seo: SeoView | null };

export interface WorkingAreaView {
  id: string;
  slug: string;
  nameEn: string; nameBn: string;
  sortOrder: number;
}

export interface ProjectView {
  id: string;
  slug: string;
  titleEn: string; titleBn: string;
  clientName: string | null;
  locationEn: string; locationBn: string;
  areaSqft: number | null;
  year: number | null;
  descriptionEn: string; descriptionBn: string;
  workingAreaId: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
  cover: MediaView | null;
}
export type ProjectDetailView = ProjectView & {
  gallery: MediaView[];
  seo: SeoView | null;
  workingArea: WorkingAreaView;
};

export interface HeroSegmentView {
  id: string;
  sortOrder: number;
  labelEn: string; labelBn: string;
  captionEn: string | null; captionBn: string | null;
  focalX: number;
  active: boolean;
  showOnMobile: boolean;
  image: MediaView;
  foreground: MediaView | null;
}

export interface BlogPostView {
  id: string;
  slug: string;
  titleEn: string; titleBn: string;
  excerptEn: string; excerptBn: string;
  bodyEn: string; bodyBn: string;
  tags: string[];
  published: boolean;
  publishedAt: string | null;
  cover: MediaView | null;
}
export type BlogPostDetailView = BlogPostView & { seo: SeoView | null };

export interface TestimonialView {
  id: string;
  authorName: string;
  roleEn: string | null; roleBn: string | null;
  quoteEn: string; quoteBn: string;
  rating: number | null;
  avatar: MediaView | null;
  sortOrder: number;
}

export interface TeamMemberView {
  id: string;
  name: string;
  roleEn: string; roleBn: string;
  bioEn: string | null; bioBn: string | null;
  photo: MediaView | null;
  sortOrder: number;
}

export interface CertificationView {
  id: string;
  titleEn: string; titleBn: string;
  issuer: string | null;
  reference: string | null;
  document: MediaView | null;
  sortOrder: number;
}

export interface CorporateClientView {
  id: string;
  serial: number;
  companyName: string;
  address: string;
  isFlagship: boolean;
  needsVerification: boolean;
}

/**
 * Aggregate only. Spec §11 — the residential list names private individuals
 * with their neighbourhoods, so the public surface never carries the rows.
 */
export interface ResidentialSummaryView {
  total: number;
  districts: string[];
}

export interface SiteSettingsView {
  id: string;
  phone: string;
  whatsapp: string;
  email: string;
  addressEn: string; addressBn: string;
  hoursEn: string; hoursBn: string;
  facebookUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  establishedYear: number;
  corporateProjectCount: number;
  residentialProjectCount: number;
  districtCount: number;
}
```

- [ ] **Step 8: Name every endpoint once**

`apps/web/lib/content.ts`:

```ts
import { apiGet, apiGetOr, apiGetOrNull } from "./api";
import type {
  BlogPostDetailView, BlogPostView, CertificationView, CorporateClientView, HeroSegmentView,
  ProjectDetailView, ProjectView, ResidentialSummaryView, ServiceDetailView, ServiceView,
  SiteSettingsView, TeamMemberView, TestimonialView, WorkingAreaView,
} from "./api.types";

export const getSettings = () => apiGet<SiteSettingsView>("/settings", { tags: ["settings"] });

export const getServices = () => apiGet<ServiceView[]>("/services", { tags: ["services"] });
export const getService = (slug: string) =>
  apiGetOrNull<ServiceDetailView>(`/services/${slug}`, { tags: ["services"] });

export const getWorkingAreas = () =>
  apiGet<WorkingAreaView[]>("/working-areas", { tags: ["working-areas"] });

export const getProjects = (workingArea?: string) =>
  apiGet<ProjectView[]>(
    workingArea ? `/projects?workingArea=${encodeURIComponent(workingArea)}` : "/projects",
    { tags: ["projects"] },
  );
export const getProject = (slug: string) =>
  apiGetOrNull<ProjectDetailView>(`/projects/${slug}`, { tags: ["projects"] });

export const getHero = (target: "desktop" | "mobile" = "desktop") =>
  apiGetOr<HeroSegmentView[]>(`/hero?target=${target}`, [], { tags: ["hero"] });

export const getBlogPosts = () => apiGet<BlogPostView[]>("/blog", { tags: ["blog"] });
export const getBlogPost = (slug: string) =>
  apiGetOrNull<BlogPostDetailView>(`/blog/${slug}`, { tags: ["blog"] });

// Sections that hide when empty (spec §12) tolerate an API failure by staying hidden.
export const getTestimonials = () =>
  apiGetOr<TestimonialView[]>("/testimonials", [], { tags: ["testimonials"] });
export const getTeam = () => apiGetOr<TeamMemberView[]>("/team", [], { tags: ["team"] });
export const getCertifications = () =>
  apiGetOr<CertificationView[]>("/certifications", [], { tags: ["certifications"] });
export const getCorporateClients = () =>
  apiGetOr<CorporateClientView[]>("/clients/corporate", [], { tags: ["clients"] });

export const getResidentialSummary = () =>
  apiGetOr<ResidentialSummaryView>(
    "/clients/residential-summary",
    { total: 0, districts: [] },
    { tags: ["clients"] },
  );
```

- [ ] **Step 9: Write the failing `<Picture>` test**

Add to `apps/web/vitest.setup.ts` — the App Router hooks do not exist under jsdom:

```ts
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
```

`apps/web/components/media/picture.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MediaView } from "@/lib/api.types";
import { Picture } from "./picture";

const media: MediaView = {
  id: "m1", storageKey: "abc", mimeType: "image/jpeg",
  width: 1920, height: 1080, bytes: 1000, blurhash: null,
  altEn: "A living room", altBn: "একটি বসার ঘর",
  createdAt: "2026-01-01T00:00:00.000Z",
  sources: [
    { type: "image/avif", srcset: "http://cdn/abc/480.avif 480w, http://cdn/abc/1920.avif 1920w" },
    { type: "image/webp", srcset: "http://cdn/abc/480.webp 480w, http://cdn/abc/1920.webp 1920w" },
  ],
};

describe("Picture", () => {
  it("uses the locale's alt text", () => {
    render(<Picture media={media} locale="bn" sizes="100vw" />);
    expect(screen.getByAltText("একটি বসার ঘর")).toBeInTheDocument();
  });

  it("emits one <source> per format, avif first", () => {
    const { container } = render(<Picture media={media} locale="en" sizes="100vw" />);
    const types = [...container.querySelectorAll("source")].map((s) => s.getAttribute("type"));
    expect(types).toEqual(["image/avif", "image/webp"]);
  });

  it("falls back to the widest webp on the <img>", () => {
    render(<Picture media={media} locale="en" sizes="100vw" />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "http://cdn/abc/1920.webp");
  });

  it("carries intrinsic dimensions so nothing shifts on load", () => {
    render(<Picture media={media} locale="en" sizes="100vw" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("width", "1920");
    expect(img).toHaveAttribute("height", "1080");
  });

  it("lazy-loads by default and eager-loads when priority is set", () => {
    const { rerender } = render(<Picture media={media} locale="en" sizes="100vw" />);
    expect(screen.getByRole("img")).toHaveAttribute("loading", "lazy");

    rerender(<Picture media={media} locale="en" sizes="100vw" priority />);
    expect(screen.getByRole("img")).toHaveAttribute("loading", "eager");
    expect(screen.getByRole("img")).toHaveAttribute("fetchpriority", "high");
  });
});
```

- [ ] **Step 10: Run and watch it fail, then implement**

```bash
pnpm --filter @homeinn/web test -- picture
```
Expected: FAIL — `./picture` unresolved.

`apps/web/components/media/picture.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import type { MediaView } from "@/lib/api.types";
import { blurhashAverageColor, largestSrc } from "@/lib/media";

interface PictureProps {
  media: MediaView;
  locale: Locale;
  /** The `sizes` attribute. Get this right or the browser downloads the 1920. */
  sizes: string;
  /** Set on the LCP element only — the first hero segment (spec §7). */
  priority?: boolean;
  className?: string;
}

/**
 * Renders the API's own AVIF/WebP derivatives. Deliberately not `next/image`:
 * the sharp pipeline in `apps/api` has already produced every width in both
 * formats, and re-encoding them through the Next loader would repeat that work.
 */
export function Picture({ media, locale, sizes, priority = false, className }: PictureProps) {
  const webp = media.sources.find((source) => source.type === "image/webp");
  const alt = locale === "bn" ? media.altBn : media.altEn;

  return (
    <picture>
      {media.sources.map((source) => (
        <source key={source.type} type={source.type} srcSet={source.srcset} sizes={sizes} />
      ))}
      <img
        src={largestSrc(webp?.srcset ?? media.sources[0]?.srcset ?? "")}
        alt={alt}
        width={media.width}
        height={media.height}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding={priority ? "sync" : "async"}
        className={className}
        style={{ backgroundColor: blurhashAverageColor(media.blurhash) }}
      />
    </picture>
  );
}
```

- [ ] **Step 11: Run everything**

```bash
pnpm --filter @homeinn/web test
pnpm typecheck
```
Expected: PASS — 22 web tests.

- [ ] **Step 12: Commit**

```bash
git add apps/web
git commit -m "feat(web): add the api client, locale text picker, and media helpers"
```

---

## Task 8: Site chrome — header, footer, locale switcher, WhatsApp

**Files:**
- Create: `apps/web/test/render.tsx`
- Create: `apps/web/lib/whatsapp.ts`, `apps/web/lib/whatsapp.test.ts`
- Create: `apps/web/components/layout/site-header.tsx`, `apps/web/components/layout/site-header.test.tsx`
- Create: `apps/web/components/layout/site-footer.tsx`, `apps/web/components/layout/site-footer.test.tsx`
- Create: `apps/web/components/layout/locale-switcher.tsx`
- Create: `apps/web/components/layout/whatsapp-button.tsx`
- Create: `apps/web/hooks/use-scrolled.ts`
- Modify: `apps/web/app/[locale]/layout.tsx`

**Interfaces:**
- Consumes: `Link` from `@/i18n/navigation`; `getSettings()` from `@/lib/content`; `Sheet*` and `Button` from `@homeinn/ui`.
- Produces:
  - `renderWithIntl(ui, { locale? })` — the test helper every component test from here on uses
  - `whatsappHref(number: string, message?: string): string`
  - `<SiteHeader locale settings />`, `<SiteFooter locale settings />`
  - `useScrolled(threshold?): boolean`

Nav is the §6 set — Home · About · Services · Projects · Clients · Blog · Contact — plus the language toggle and a persistent WhatsApp affordance, thin and near-transparent over the hero, gaining a background on scroll.

- [ ] **Step 1: Write the test helper**

`apps/web/test/render.tsx`:

```tsx
import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import bn from "@/messages/bn.json";
import en from "@/messages/en.json";

/**
 * Renders with the real message catalogues, so a component referencing a key
 * that does not exist fails the test rather than shipping a raw key to a user.
 */
export function renderWithIntl(
  ui: ReactElement,
  { locale = "en" as "en" | "bn", ...options }: RenderOptions & { locale?: "en" | "bn" } = {},
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "bn" ? bn : en}>
      {ui}
    </NextIntlClientProvider>,
    options,
  );
}

export const settingsFixture = {
  id: "singleton",
  phone: "01760775454",
  whatsapp: "+8801760775454",
  email: "homeinnbd14@gmail.com",
  addressEn: "Plot# 18, Road# 03, Block# KHA, Section# 06, Mirpur-10, Dhaka-1216",
  addressBn: "প্লট# ১৮, রোড# ০৩, ব্লক# খ, সেকশন# ০৬, মিরপুর-১০, ঢাকা-১২১৬",
  hoursEn: "Open every day",
  hoursBn: "প্রতিদিন খোলা",
  facebookUrl: "https://www.facebook.com/homeinnbd14",
  instagramUrl: "https://www.instagram.com/homeinnbd",
  youtubeUrl: null,
  establishedYear: 2015,
  corporateProjectCount: 73,
  residentialProjectCount: 57,
  districtCount: 13,
};
```

- [ ] **Step 2: Write the failing tests**

`apps/web/lib/whatsapp.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { whatsappHref } from "./whatsapp";

describe("whatsappHref", () => {
  it("strips everything that is not a digit", () => {
    expect(whatsappHref("+880 1760-775454")).toBe("https://wa.me/8801760775454");
  });

  it("expands a local 01… number to the country code", () => {
    expect(whatsappHref("01760775454")).toBe("https://wa.me/8801760775454");
  });

  it("url-encodes a prefilled message", () => {
    expect(whatsappHref("01760775454", "Hello Home Inn"))
      .toBe("https://wa.me/8801760775454?text=Hello%20Home%20Inn");
  });
});
```

`apps/web/components/layout/site-header.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithIntl, settingsFixture } from "@/test/render";
import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  it("links to all seven routes from spec §6", () => {
    renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    for (const label of ["Home", "About", "Services", "Projects", "Clients", "Blog", "Contact"]) {
      expect(screen.getAllByRole("link", { name: label }).length).toBeGreaterThan(0);
    }
  });

  it("renders the nav in Bangla for bn", () => {
    renderWithIntl(<SiteHeader locale="bn" settings={settingsFixture} />, { locale: "bn" });
    expect(screen.getAllByRole("link", { name: "প্রকল্প" }).length).toBeGreaterThan(0);
  });

  it("offers the other language, not the current one, as the active choice", () => {
    renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    const toggle = screen.getByRole("link", { name: "বাংলা" });
    expect(toggle).toHaveAttribute("hreflang", "bn");
  });

  it("exposes a persistent WhatsApp affordance", () => {
    renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    expect(screen.getByRole("link", { name: "Chat on WhatsApp" }))
      .toHaveAttribute("href", "https://wa.me/8801760775454");
  });

  it("opens the mobile menu on request", async () => {
    renderWithIntl(<SiteHeader locale="en" settings={settingsFixture} />);
    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
```

`apps/web/components/layout/site-footer.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl, settingsFixture } from "@/test/render";
import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("shows the real NAP from settings", () => {
    renderWithIntl(<SiteFooter locale="en" settings={settingsFixture} />);
    expect(screen.getByText(/Mirpur-10, Dhaka-1216/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /01760775454/ }))
      .toHaveAttribute("href", "tel:01760775454");
    expect(screen.getByRole("link", { name: /homeinnbd14@gmail.com/ }))
      .toHaveAttribute("href", "mailto:homeinnbd14@gmail.com");
  });

  it("uses the Bangla address for bn", () => {
    renderWithIntl(<SiteFooter locale="bn" settings={settingsFixture} />, { locale: "bn" });
    expect(screen.getByText(/মিরপুর-১০/)).toBeInTheDocument();
  });

  it("omits a social link the settings do not carry", () => {
    renderWithIntl(<SiteFooter locale="en" settings={settingsFixture} />);
    expect(screen.getByRole("link", { name: "Facebook" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "YouTube" })).not.toBeInTheDocument();
  });

  it("credits the established year", () => {
    renderWithIntl(<SiteFooter locale="en" settings={settingsFixture} />);
    expect(screen.getByText(/2015/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run and watch them fail**

```bash
pnpm --filter @homeinn/web test
```
Expected: FAIL — three unresolved modules.

- [ ] **Step 4: Implement `lib/whatsapp.ts`**

```ts
/**
 * A wa.me deep link. Bangladeshi numbers are stored locally (`01760775454`)
 * and sometimes internationally (`+8801760775454`); wa.me needs digits with
 * the country code and no plus.
 */
export function whatsappHref(number: string, message?: string): string {
  const digits = number.replace(/\D/g, "");
  const international = digits.startsWith("880") ? digits : `880${digits.replace(/^0/, "")}`;
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${international}${query}`;
}
```

- [ ] **Step 5: Implement the scroll hook**

`apps/web/hooks/use-scrolled.ts`:

```ts
"use client";

import { useEffect, useState } from "react";

/** True once the page has scrolled past `threshold`. Drives the nav background. */
export function useScrolled(threshold = 24): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}
```

- [ ] **Step 6: Implement the pieces**

`apps/web/components/layout/locale-switcher.tsx`:

```tsx
"use client";

import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";

/**
 * next-intl's `usePathname` returns the route without its locale prefix, so
 * switching language keeps the visitor exactly where they were — which spec
 * §13 lists as one of the flows worth an e2e test.
 */
export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const other: Locale = locale === "en" ? "bn" : "en";

  return (
    <Link
      href={pathname}
      locale={other}
      hrefLang={other}
      lang={other}
      className="text-sm underline-offset-4 hover:underline"
    >
      {other === "bn" ? t("bangla") : t("english")}
    </Link>
  );
}
```

`apps/web/components/layout/whatsapp-button.tsx`:

```tsx
import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { whatsappHref } from "@/lib/whatsapp";

export function WhatsAppButton({ number, className }: { number: string; className?: string }) {
  const t = useTranslations("common");

  return (
    <a
      href={whatsappHref(number)}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={t("whatsapp")}
      className={className}
    >
      <MessageCircle aria-hidden="true" className="size-5" />
      <span className="sr-only">{t("whatsapp")}</span>
    </a>
  );
}
```

`useTranslations` works in a server component when the tree is inside `NextIntlClientProvider`; this component carries no interactivity and stays server-rendered.

`apps/web/components/layout/site-header.tsx`:

```tsx
"use client";

import type { Locale } from "@homeinn/types";
import { Button, Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@homeinn/ui";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { SiteSettingsView } from "@/lib/api.types";
import { useScrolled } from "@/hooks/use-scrolled";
import { LocaleSwitcher } from "./locale-switcher";
import { WhatsAppButton } from "./whatsapp-button";

const ROUTES = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/services", key: "services" },
  { href: "/projects", key: "projects" },
  { href: "/clients", key: "clients" },
  { href: "/blog", key: "blog" },
  { href: "/contact", key: "contact" },
] as const;

export function SiteHeader({ locale, settings }: { locale: Locale; settings: SiteSettingsView }) {
  const t = useTranslations("nav");
  const common = useTranslations("common");
  const scrolled = useScrolled();

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled ? "bg-ink/95 text-sand backdrop-blur-sm" : "bg-transparent text-sand",
      ].join(" ")}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5">
        <Link href="/" className="font-display text-lg tracking-tight">
          {common("brand")}
        </Link>

        <nav aria-label={t("menu")} className="hidden items-center gap-7 lg:flex">
          {ROUTES.map((route) => (
            <Link key={route.href} href={route.href} className="text-sm hover:text-brand">
              {t(route.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <LocaleSwitcher locale={locale} />
          <WhatsAppButton number={settings.whatsapp} className="hover:text-brand" />

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="lg:hidden" aria-label={t("menu")}>
                <Menu aria-hidden="true" className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-ink text-sand">
              <SheetTitle className="heading">{t("menu")}</SheetTitle>
              <nav className="mt-8 flex flex-col gap-5">
                {ROUTES.map((route) => (
                  <SheetClose asChild key={route.href}>
                    <Link href={route.href} className="text-lg">
                      {t(route.key)}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
```

The desktop nav and the sheet render the same seven labels, which is why the header test asserts `getAllByRole(...).length > 0` rather than a single match.

`apps/web/components/layout/site-footer.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { SiteSettingsView } from "@/lib/api.types";
import { text } from "@/lib/locale-text";

const SOCIALS = [
  { key: "facebookUrl", label: "Facebook" },
  { key: "instagramUrl", label: "Instagram" },
  { key: "youtubeUrl", label: "YouTube" },
] as const;

export function SiteFooter({ locale, settings }: { locale: Locale; settings: SiteSettingsView }) {
  const t = useTranslations("common");
  const nav = useTranslations("nav");

  return (
    <footer className="bg-ink text-sand-dim">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg text-sand">{t("brand")}</p>
          <p className="mt-2 text-sm">{t("tagline")}</p>
          <p className="mt-6 text-sm">{t("since", { year: settings.establishedYear })}</p>
        </div>

        <address className="not-italic text-sm">
          <p className="eyebrow">{t("address")}</p>
          <p className="mt-2 text-sand">{text(settings, "address", locale)}</p>
          <p className="mt-4">
            <a className="hover:text-brand" href={`tel:${settings.phone}`}>{settings.phone}</a>
          </p>
          <p>
            <a className="hover:text-brand" href={`mailto:${settings.email}`}>{settings.email}</a>
          </p>
          <p className="mt-4">{text(settings, "hours", locale)}</p>
        </address>

        <nav aria-label={nav("menu")} className="text-sm">
          <p className="eyebrow">{nav("menu")}</p>
          <ul className="mt-2 space-y-2">
            {(["about", "services", "projects", "clients", "blog", "contact"] as const).map((key) => (
              <li key={key}>
                <Link href={`/${key}`} className="hover:text-brand">{nav(key)}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="text-sm">
          <p className="eyebrow">{t("social")}</p>
          <ul className="mt-2 space-y-2">
            {SOCIALS.map(({ key, label }) =>
              settings[key] ? (
                <li key={key}>
                  <a
                    className="hover:text-brand"
                    href={settings[key] as string}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {label}
                  </a>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 7: Mount them in the locale layout**

`apps/web/app/[locale]/layout.tsx` — add the fetch and the chrome:

```tsx
import { getSettings } from "@/lib/content";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
```

```tsx
  const settings = await getSettings();

  return (
    <html lang={locale} className={fontVariables}>
      <body className={fontClassFor(locale)}>
        <NextIntlClientProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:m-3 focus:bg-brand focus:px-4 focus:py-2 focus:text-bone">
            {/* Rendered from the catalogue by the page; see components/layout */}
          </a>
          <SiteHeader locale={locale} settings={settings} />
          {children}
          <SiteFooter locale={locale} settings={settings} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
```

Replace the empty skip-link body with a small server component so the string comes from the catalogue:

`apps/web/components/layout/skip-link.tsx`:

```tsx
import { useTranslations } from "next-intl";

export function SkipLink() {
  const t = useTranslations("common");
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:m-3 focus:bg-brand focus:px-4 focus:py-2 focus:text-bone"
    >
      {t("skipToContent")}
    </a>
  );
}
```

and use `<SkipLink />` in the layout.

- [ ] **Step 8: Run and watch them pass**

```bash
pnpm --filter @homeinn/web test
pnpm --filter @homeinn/web build
pnpm typecheck
```
Expected: PASS — 12 new tests (3 whatsapp, 5 header, 4 footer).

The build now calls `GET /api/settings` at build time. Start the API first:
```bash
pnpm db:start
pnpm --filter @homeinn/api dev   # in another shell
```

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat(web): add the site header, footer, locale switcher, and whatsapp affordance"
```

---

## Task 9: The hero's maths

**Files:**
- Create: `apps/web/components/hero/hero-math.ts`, `apps/web/components/hero/hero-math.test.ts`

**Interfaces:**
- Consumes: nothing. These are pure functions with no DOM, no React, no imports.
- Produces:
  - `clamp01(value): number`
  - `stripWidth(count, viewportWidth): number`
  - `stripTranslateX(p, count, viewportWidth): number`
  - `foregroundTranslateX(p, count, viewportWidth): number` and `FOREGROUND_RATE = 1.35`
  - `segmentWindow(index, count): { start: number; end: number }`
  - `labelOpacity(p, index, count): number`
  - `lightPoolX(p, count): number`
  - `scrollDistanceVh(count, target): number`
  - `pinProgress(rectTop, sectionHeight, viewportHeight): number`
  - `objectPosition(focalX): string`

Spec §13 asks for exactly this: "the hero's progress→transform math is a pure function and is tested as one, independently of the DOM."

- [ ] **Step 1: Write the failing tests**

`apps/web/components/hero/hero-math.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  FOREGROUND_RATE, clamp01, foregroundTranslateX, labelOpacity, lightPoolX, objectPosition,
  pinProgress, scrollDistanceVh, segmentWindow, stripTranslateX, stripWidth,
} from "./hero-math";

describe("clamp01", () => {
  it("clamps below and above", () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(4)).toBe(1);
    expect(clamp01(0.5)).toBe(0.5);
  });
});

describe("stripWidth", () => {
  it("is one viewport per segment", () => {
    expect(stripWidth(6, 1440)).toBe(8640);
  });
});

describe("stripTranslateX", () => {
  it("starts at zero", () => {
    expect(stripTranslateX(0, 6, 1440)).toBe(0);
  });

  it("ends with the last segment exactly filling the viewport", () => {
    // Travel is stripWidth - viewportWidth, never more: the strip must not
    // over-scroll past its final segment.
    expect(stripTranslateX(1, 6, 1440)).toBe(-(6 * 1440 - 1440));
  });

  it("is linear in p", () => {
    expect(stripTranslateX(0.5, 6, 1440)).toBe(-(6 * 1440 - 1440) / 2);
  });

  it("does not move a single-segment strip", () => {
    expect(stripTranslateX(1, 1, 1440)).toBe(0);
  });

  it("clamps out-of-range progress", () => {
    expect(stripTranslateX(-1, 6, 1440)).toBe(0);
    expect(stripTranslateX(2, 6, 1440)).toBe(stripTranslateX(1, 6, 1440));
  });
});

describe("foregroundTranslateX", () => {
  it("moves faster than the strip, so it reads as near-field depth", () => {
    // Spec §7: the foreground straddles each joint at ~1.35x the strip's rate,
    // which is what stops the eye hunting for the seam.
    expect(FOREGROUND_RATE).toBeGreaterThan(1);
    expect(foregroundTranslateX(0.5, 6, 1440))
      .toBeCloseTo(stripTranslateX(0.5, 6, 1440) * FOREGROUND_RATE);
  });
});

describe("segmentWindow", () => {
  it("centres the first segment at p = 0 and the last at p = 1", () => {
    expect(segmentWindow(0, 6).start).toBeLessThanOrEqual(0);
    expect(segmentWindow(5, 6).end).toBeGreaterThanOrEqual(1);
  });

  it("gives adjacent segments touching windows", () => {
    expect(segmentWindow(1, 6).end).toBeCloseTo(segmentWindow(2, 6).start);
  });

  it("gives a lone segment the whole range", () => {
    expect(segmentWindow(0, 1)).toEqual({ start: 0, end: 1 });
  });
});

describe("labelOpacity", () => {
  it("is fully visible at its own segment's centre", () => {
    expect(labelOpacity(0, 0, 6)).toBe(1);
    expect(labelOpacity(0.2, 1, 6)).toBe(1);
    expect(labelOpacity(1, 5, 6)).toBe(1);
  });

  it("is invisible at the neighbouring segment's centre", () => {
    expect(labelOpacity(0.2, 0, 6)).toBe(0);
    expect(labelOpacity(0, 3, 6)).toBe(0);
  });

  it("crossfades in between, never leaving a gap where nothing is legible", () => {
    const midpoint = 0.1; // halfway between segment 0 and segment 1 of six
    expect(labelOpacity(midpoint, 0, 6) + labelOpacity(midpoint, 1, 6)).toBeGreaterThan(0.4);
  });

  it("always returns a value between 0 and 1", () => {
    for (let p = 0; p <= 1; p += 0.05) {
      for (let i = 0; i < 6; i++) {
        const value = labelOpacity(p, i, 6);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it("keeps a lone label visible throughout", () => {
    expect(labelOpacity(0.5, 0, 1)).toBe(1);
  });
});

describe("lightPoolX", () => {
  it("is centred at the start", () => {
    expect(lightPoolX(0, 6)).toBeCloseTo(50);
  });

  it("stays inside the viewport", () => {
    for (let p = 0; p <= 1; p += 0.01) {
      expect(lightPoolX(p, 6)).toBeGreaterThan(20);
      expect(lightPoolX(p, 6)).toBeLessThan(80);
    }
  });

  it("is continuous across a segment boundary", () => {
    const boundary = 1 / 5; // segment 1 of six
    expect(Math.abs(lightPoolX(boundary - 0.001, 6) - lightPoolX(boundary + 0.001, 6)))
      .toBeLessThan(1);
  });
});

describe("scrollDistanceVh", () => {
  it("reproduces the spec's desktop figure for six segments", () => {
    expect(scrollDistanceVh(6, "desktop")).toBe(500);
  });

  it("reproduces the spec's mobile figure for three segments", () => {
    expect(scrollDistanceVh(3, "mobile")).toBe(300);
  });

  it("never collapses to nothing", () => {
    expect(scrollDistanceVh(1, "desktop")).toBeGreaterThan(0);
    expect(scrollDistanceVh(0, "desktop")).toBeGreaterThan(0);
  });
});

describe("pinProgress", () => {
  it("is 0 before the section is reached", () => {
    expect(pinProgress(400, 5000, 900)).toBe(0);
  });

  it("is 1 once the section has been fully traversed", () => {
    expect(pinProgress(-(5000 - 900), 5000, 900)).toBe(1);
  });

  it("is halfway at the midpoint", () => {
    expect(pinProgress(-(5000 - 900) / 2, 5000, 900)).toBeCloseTo(0.5);
  });

  it("returns 0 when the section is shorter than the viewport", () => {
    expect(pinProgress(-100, 500, 900)).toBe(0);
  });
});

describe("objectPosition", () => {
  it("maps focalX to a percentage", () => {
    expect(objectPosition(0)).toBe("0% 50%");
    expect(objectPosition(0.5)).toBe("50% 50%");
    expect(objectPosition(1)).toBe("100% 50%");
  });

  it("clamps out-of-range values", () => {
    expect(objectPosition(-1)).toBe("0% 50%");
    expect(objectPosition(9)).toBe("100% 50%");
  });
});
```

- [ ] **Step 2: Run and watch them fail**

```bash
pnpm --filter @homeinn/web test -- hero-math
```
Expected: FAIL — `./hero-math` unresolved.

- [ ] **Step 3: Implement**

`apps/web/components/hero/hero-math.ts`:

```ts
/**
 * The scroll panorama's arithmetic (spec §7), with no DOM in sight.
 *
 * The model: N segments, each exactly one viewport wide, laid out in a strip.
 * Pin progress `p` runs 0 → 1 across the section's scroll distance, and the
 * strip translates left so that at p = 0 segment 0 fills the viewport and at
 * p = 1 segment N-1 does. Every other quantity — label crossfades, the light
 * pool, the parallax foreground — is a function of that one number.
 */

export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function stripWidth(count: number, viewportWidth: number): number {
  return count * viewportWidth;
}

/** How far the strip can travel before its last segment is flush with the right edge. */
function travel(count: number, viewportWidth: number): number {
  return Math.max(0, stripWidth(count, viewportWidth) - viewportWidth);
}

export function stripTranslateX(p: number, count: number, viewportWidth: number): number {
  return -clamp01(p) * travel(count, viewportWidth);
}

/**
 * Spec §7: a column, curtain or plant straddling each joint moves at ~1.35× the
 * strip's rate. The eye reads the faster object as near-field and stops looking
 * for the seam behind it.
 */
export const FOREGROUND_RATE = 1.35;

export function foregroundTranslateX(p: number, count: number, viewportWidth: number): number {
  return stripTranslateX(p, count, viewportWidth) * FOREGROUND_RATE;
}

/** The span of `p` over which segment `index` is the one on screen. */
export function segmentWindow(index: number, count: number): { start: number; end: number } {
  if (count <= 1) return { start: 0, end: 1 };
  const step = 1 / (count - 1);
  const centre = index * step;
  return { start: centre - step / 2, end: centre + step / 2 };
}

/** Full opacity within this much of a step from the centre. */
const LABEL_PLATEAU = 0.35;
/** Fully faded by this much of a step from the centre. */
const LABEL_FADE_END = 0.9;

export function labelOpacity(p: number, index: number, count: number): number {
  if (count <= 1) return 1;
  const step = 1 / (count - 1);
  const distance = Math.abs(clamp01(p) - index * step) / step;

  if (distance <= LABEL_PLATEAU) return 1;
  if (distance >= LABEL_FADE_END) return 0;
  return 1 - (distance - LABEL_PLATEAU) / (LABEL_FADE_END - LABEL_PLATEAU);
}

/** Half-width of the light pool's sweep, in viewport percent. */
const LIGHT_POOL_SWING = 22;

/**
 * Where the warm radial gradient sits, as a percentage of the viewport width.
 * One oscillation per segment, so the pool passes across each room as the
 * camera does. Without it, stitched images read as a flat filmstrip (spec §7).
 */
export function lightPoolX(p: number, count: number): number {
  if (count <= 1) return 50;
  const travelled = clamp01(p) * (count - 1);
  return 50 + LIGHT_POOL_SWING * Math.sin(travelled * Math.PI * 2);
}

/**
 * Scroll distance for the pinned section, in vh. A phone screen is narrow, so
 * the same pan feels twice as fast there and needs more scroll per segment.
 * These constants reproduce spec §7's stated 500vh for six desktop segments and
 * 300vh for three mobile ones.
 */
const VH_PER_SEGMENT = { desktop: 100, mobile: 150 } as const;

export function scrollDistanceVh(count: number, target: "desktop" | "mobile"): number {
  return Math.max(100, (count - 1) * VH_PER_SEGMENT[target]);
}

/**
 * Progress through a pinned section, derived from its bounding rect. `rectTop`
 * is `getBoundingClientRect().top` — 0 when the section's top meets the viewport
 * top, then increasingly negative as it scrolls past.
 */
export function pinProgress(
  rectTop: number,
  sectionHeight: number,
  viewportHeight: number,
): number {
  const distance = sectionHeight - viewportHeight;
  if (distance <= 0) return 0;
  return clamp01(-rectTop / distance);
}

/** `object-position` from a segment's `focalX`, so the subject survives any crop. */
export function objectPosition(focalX: number): string {
  return `${clamp01(focalX) * 100}% 50%`;
}
```

- [ ] **Step 4: Run and watch them pass**

```bash
pnpm --filter @homeinn/web test -- hero-math
```
Expected: PASS — 26 assertions across 10 describes.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): add the scroll panorama's pure transform maths"
```

---

## Task 10: The scroll panorama hero

**Files:**
- Create: `apps/web/hooks/use-prefers-reduced-motion.ts`
- Create: `apps/web/hooks/use-pin-progress.ts`
- Create: `apps/web/components/hero/panorama-hero.tsx`, `apps/web/components/hero/panorama-hero.test.tsx`
- Create: `apps/web/components/hero/hero-stack.tsx`
- Create: `apps/web/components/motion/smooth-scroll.tsx`
- Create: `apps/api/prisma/seed-hero.ts`
- Create: `apps/api/prisma/seed-data/placeholders/README.md`
- Create: `ASSET-CHECKLIST.md`
- Modify: `apps/api/package.json`, `apps/web/package.json`, `apps/web/app/[locale]/layout.tsx`

**Interfaces:**
- Consumes: everything from `hero-math.ts`; `<Picture>` from Task 7; `HeroSegmentView` from `@/lib/api.types`.
- Produces:
  - `usePrefersReducedMotion(): boolean` — **the single motion gate for the whole app**
  - `usePinProgress(ref): number`
  - `<PanoramaHero segments locale target />`
  - `<HeroStack segments locale />` — the reduced-motion layout
  - `<SmoothScroll />` — Lenis, mounted once in the layout
  - `pnpm --filter @homeinn/api seed:hero` — ingests whatever is in `prisma/seed-data/placeholders/` and creates one `HeroSegment` per file

Spec §7's isolation requirement: the component takes `segments` and knows nothing else. One segment renders a static hero; zero segments render the text-only hero; a real wide panorama later pans identically.

- [ ] **Step 1: Install Lenis**

```bash
pnpm --filter @homeinn/web add lenis
```

- [ ] **Step 2: Write the failing tests**

`apps/web/components/hero/panorama-hero.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HeroSegmentView, MediaView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { PanoramaHero } from "./panorama-hero";

function media(id: string): MediaView {
  return {
    id, storageKey: id, mimeType: "image/jpeg",
    width: 1920, height: 1080, bytes: 1000, blurhash: null,
    altEn: `Room ${id}`, altBn: `ঘর ${id}`,
    createdAt: "2026-01-01T00:00:00.000Z",
    sources: [{ type: "image/webp", srcset: `http://cdn/${id}/1920.webp 1920w` }],
  };
}

function segment(index: number, over: Partial<HeroSegmentView> = {}): HeroSegmentView {
  return {
    id: `s${index}`, sortOrder: index,
    labelEn: `Room ${index}`, labelBn: `ঘর ${index}`,
    captionEn: null, captionBn: null,
    focalX: 0.5, active: true, showOnMobile: true,
    image: media(`i${index}`), foreground: null,
    ...over,
  };
}

function setReducedMotion(reduced: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query.includes("reduce"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

beforeEach(() => setReducedMotion(false));

describe("PanoramaHero", () => {
  it("renders every room label as real text, not baked into an image", () => {
    // Spec §7 accessibility: labels are DOM text.
    renderWithIntl(<PanoramaHero segments={[segment(0), segment(1)]} locale="en" target="desktop" />);
    expect(screen.getByText("Room 0")).toBeInTheDocument();
    expect(screen.getByText("Room 1")).toBeInTheDocument();
  });

  it("uses Bangla labels for bn", () => {
    renderWithIntl(
      <PanoramaHero segments={[segment(0)]} locale="bn" target="desktop" />, { locale: "bn" });
    expect(screen.getByText("ঘর 0")).toBeInTheDocument();
  });

  it("labels the section for assistive technology", () => {
    renderWithIntl(<PanoramaHero segments={[segment(0), segment(1)]} locale="en" target="desktop" />);
    expect(screen.getByRole("region")).toHaveAccessibleName();
  });

  it("gives the section its scroll distance from the segment count", () => {
    const { container } = renderWithIntl(
      <PanoramaHero segments={[segment(0), segment(1), segment(2)]} locale="en" target="desktop" />);
    expect(container.querySelector("section")).toHaveStyle({ height: "200vh" });
  });

  it("marks the first image as the LCP element and lazies the rest", () => {
    renderWithIntl(
      <PanoramaHero segments={[segment(0), segment(1), segment(2)]} locale="en" target="desktop" />);
    const images = screen.getAllByRole("img");
    expect(images[0]).toHaveAttribute("fetchpriority", "high");
    expect(images[2]).toHaveAttribute("loading", "lazy");
  });

  it("renders a plain vertical stack under prefers-reduced-motion", () => {
    // Spec §7: no pin, no transform — same content, ordinary scroll.
    setReducedMotion(true);
    const { container } = renderWithIntl(
      <PanoramaHero segments={[segment(0), segment(1)]} locale="en" target="desktop" />);
    expect(container.querySelector("[data-hero-strip]")).toBeNull();
    expect(screen.getByText("Room 1")).toBeInTheDocument();
  });

  it("renders a text-only hero when no segments have been published yet", () => {
    renderWithIntl(<PanoramaHero segments={[]} locale="en" target="desktop" />);
    expect(screen.getByText("Interiors built to be lived in")).toBeInTheDocument();
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("renders a single segment as a static hero rather than a one-frame pan", () => {
    const { container } = renderWithIntl(
      <PanoramaHero segments={[segment(0)]} locale="en" target="desktop" />);
    expect(container.querySelector("[data-hero-strip]")).toBeNull();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("offers a skip link past the pinned section", () => {
    renderWithIntl(<PanoramaHero segments={[segment(0), segment(1)]} locale="en" target="desktop" />);
    expect(screen.getByRole("link", { name: "Skip the panorama" }))
      .toHaveAttribute("href", "#after-hero");
  });
});
```

- [ ] **Step 3: Run and watch it fail**

```bash
pnpm --filter @homeinn/web test -- panorama
```
Expected: FAIL — `./panorama-hero` unresolved.

- [ ] **Step 4: Implement the two hooks**

`apps/web/hooks/use-prefers-reduced-motion.ts`:

```ts
"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * The single motion gate for this app (spec §8). Starts `true` on the server and
 * on the first client render so nothing animates before the preference is known
 * — the safe default is stillness, not movement.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const list = window.matchMedia(QUERY);
    setReduced(list.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
```

`apps/web/hooks/use-pin-progress.ts`:

```ts
"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { pinProgress } from "@/components/hero/hero-math";

/**
 * Progress through a sticky-pinned section, 0 → 1.
 *
 * `position: sticky` does the pinning; this only reads the section's rect. One
 * rAF per frame at most, and the listener is passive, so scrolling is never
 * blocked on this work.
 */
export function usePinProgress(ref: RefObject<HTMLElement | null>, enabled: boolean): number {
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      frame.current = null;
      const rect = element.getBoundingClientRect();
      setProgress(pinProgress(rect.top, rect.height, window.innerHeight));
    };

    const schedule = () => {
      if (frame.current === null) frame.current = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, [ref, enabled]);

  return progress;
}
```

- [ ] **Step 5: Implement the reduced-motion layout**

`apps/web/components/hero/hero-stack.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import type { HeroSegmentView } from "@/lib/api.types";
import { Picture } from "@/components/media/picture";
import { text, textOrNull } from "@/lib/locale-text";

/**
 * The reduced-motion hero: the same rooms, the same labels, ordinary vertical
 * scroll. Spec §7 calls this a first-class layout, not a fallback, so it gets
 * the full-bleed treatment rather than a shrunken one.
 */
export function HeroStack({
  segments,
  locale,
}: {
  segments: HeroSegmentView[];
  locale: Locale;
}) {
  return (
    <div className="bg-ink text-sand">
      {segments.map((segment, index) => {
        const caption = textOrNull(segment, "caption", locale);
        return (
          <figure key={segment.id} className="relative">
            <Picture
              media={segment.image}
              locale={locale}
              sizes="100vw"
              priority={index === 0}
              className="h-[70svh] w-full object-cover"
            />
            <figcaption className="absolute bottom-0 left-0 p-6">
              <p className="display-2">{text(segment, "label", locale)}</p>
              {caption ? <p className="mt-1 text-sand-dim">{caption}</p> : null}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: Implement the panorama**

`apps/web/components/hero/panorama-hero.tsx`:

```tsx
"use client";

import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { useRef, type CSSProperties } from "react";
import { Picture } from "@/components/media/picture";
import type { HeroSegmentView } from "@/lib/api.types";
import { text, textOrNull } from "@/lib/locale-text";
import { usePinProgress } from "@/hooks/use-pin-progress";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { HeroStack } from "./hero-stack";
import {
  foregroundTranslateX, labelOpacity, lightPoolX, objectPosition, scrollDistanceVh,
  stripTranslateX,
} from "./hero-math";

interface PanoramaHeroProps {
  segments: HeroSegmentView[];
  locale: Locale;
  target: "desktop" | "mobile";
}

/**
 * Spec §7. Vertical scroll drives a horizontal camera dolly through what reads
 * as one continuous interior. Sticky does the pinning; the strip translates;
 * a faster foreground and a masked edge hide each joint; a warm light pool
 * tracks the camera so the stitched images do not read as a filmstrip.
 *
 * Knows nothing about the CMS. One segment is a static hero, zero segments is
 * a text hero, and a single wide panorama later pans through the same code.
 */
export function PanoramaHero({ segments, locale, target }: PanoramaHeroProps) {
  const t = useTranslations("home");
  const common = useTranslations("common");
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  const animated = !reduced && segments.length > 1;
  const progress = usePinProgress(sectionRef, animated);

  if (segments.length === 0) {
    return (
      <section aria-label={t("heroFallbackTitle")} className="bg-ink text-sand">
        <div className="mx-auto flex min-h-[80svh] max-w-7xl flex-col justify-end px-5 pb-20">
          <p className="eyebrow">{common("tagline")}</p>
          <h1 className="display-1 mt-4 max-w-3xl text-sand">{t("heroFallbackTitle")}</h1>
        </div>
        <div id="after-hero" />
      </section>
    );
  }

  if (!animated) {
    return (
      <>
        <section aria-label={t("heroFallbackTitle")}>
          <HeroStack segments={segments} locale={locale} />
        </section>
        <div id="after-hero" />
      </>
    );
  }

  const count = segments.length;

  return (
    <>
      <section
        ref={sectionRef}
        aria-label={t("heroFallbackTitle")}
        style={{ height: `${scrollDistanceVh(count, target)}vh` }}
      >
        <div className="sticky top-0 h-dvh overflow-hidden bg-ink">
          <div
            data-hero-strip
            className="flex h-full will-change-transform"
            style={{
              width: `${count * 100}vw`,
              transform: `translate3d(${stripTranslateX(progress, count, 100) }vw, 0, 0)`,
            }}
          >
            {segments.map((segment, index) => (
              <div
                key={segment.id}
                className="relative h-full w-screen shrink-0"
                style={{
                  // Spec §7's first seam treatment: the edges of adjacent
                  // segments fade out, so no hard vertical line survives.
                  maskImage:
                    "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
                  WebkitMaskImage:
                    "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
                }}
              >
                <Picture
                  media={segment.image}
                  locale={locale}
                  sizes="100vw"
                  priority={index === 0}
                  className="h-full w-full object-cover"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{ objectPosition: objectPosition(segment.focalX) }}
                />
              </div>
            ))}
          </div>

          {/* Second seam treatment: near-field objects crossing each joint. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex will-change-transform"
            style={{
              width: `${count * 100}vw`,
              transform: `translate3d(${foregroundTranslateX(progress, count, 100)}vw, 0, 0)`,
            }}
          >
            {segments.map((segment) => (
              <div key={segment.id} className="relative h-full w-screen shrink-0">
                {segment.foreground ? (
                  <Picture
                    media={segment.foreground}
                    locale={locale}
                    sizes="100vw"
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
            ))}
          </div>

          {/* The light pool. Without it, stitched images read as flat. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 mix-blend-screen"
            style={
              {
                background: `radial-gradient(60vw 60vh at ${lightPoolX(progress, count)}% 45%, color-mix(in oklab, var(--color-amber) 26%, transparent), transparent 70%)`,
              } as CSSProperties
            }
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6 md:p-12">
            <div className="relative h-24">
              {segments.map((segment, index) => {
                const caption = textOrNull(segment, "caption", locale);
                return (
                  <div
                    key={segment.id}
                    className="absolute bottom-0 left-0 transition-opacity duration-200"
                    style={{
                      opacity: labelOpacity(progress, index, count),
                      transform: `translateY(${(1 - labelOpacity(progress, index, count)) * 12}px)`,
                    }}
                  >
                    <p className="display-2 text-sand">{text(segment, "label", locale)}</p>
                    {caption ? <p className="mt-1 text-sand-dim">{caption}</p> : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-ink-line">
                <div
                  className="h-px bg-brand transition-[width] duration-100"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="eyebrow shrink-0">{t("heroCue")}</p>
            </div>
          </div>

          <a
            href="#after-hero"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:bg-brand focus:px-4 focus:py-2 focus:text-bone"
          >
            {common("skipHero")}
          </a>
        </div>
      </section>
      <div id="after-hero" />
    </>
  );
}
```

`stripTranslateX(progress, count, 100)` is called with a viewport width of `100` so the result is directly in `vw` units — the maths is unit-agnostic, which is exactly why it is a pure function.

- [ ] **Step 7: Add smooth scroll**

`apps/web/components/motion/smooth-scroll.tsx`:

```tsx
"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/**
 * Lenis, mounted once. Desktop pointers only — on touch, the OS scroller is
 * better than anything JavaScript can do, and hijacking it costs more than the
 * feel is worth. Off entirely under prefers-reduced-motion.
 */
export function SmoothScroll() {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduced]);

  return null;
}
```

Mount `<SmoothScroll />` in `apps/web/app/[locale]/layout.tsx`, immediately inside `NextIntlClientProvider`.

- [ ] **Step 8: Run and watch the tests pass**

```bash
pnpm --filter @homeinn/web test -- panorama
```
Expected: PASS, 9 tests.

- [ ] **Step 9: Give the hero something to render**

The `HeroSegment` table is empty and stays empty until images exist. Spec §15 calls for curated free-licence placeholders tracked in a checklist, so build the pipeline rather than the pictures.

`apps/api/prisma/seed-data/placeholders/README.md`:

```markdown
# Hero placeholder images

Drop 1920×1080 images here, named `01-living-room.jpg`, `02-dining.jpg`, … The
number is the segment order; the rest of the filename becomes the English label
(hyphens to spaces, title case). `pnpm seed:hero` ingests them through the same
sharp pipeline the CMS uses and creates one `HeroSegment` per file.

Every file must have a line in `/ASSET-CHECKLIST.md` recording its source and
licence before it is committed. Spec §15: placeholders are free-licence
(Unsplash / Pexels) and each one is tracked so the client can see what is still
a stand-in.

Bangla labels and captions are set in the admin (Plan 1C) — the seed writes the
English label and copies it to the Bangla column so the not-null constraint
holds, and the row is flagged in the checklist as needing translation.
```

`apps/api/prisma/seed-hero.ts`:

```ts
import { PrismaClient } from "@prisma/client";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { MediaService } from "../src/media/media.service";
import { LocalDiskStorage } from "../src/media/storage/local-disk.storage";

const DIR = join(__dirname, "seed-data", "placeholders");

/** `01-living-room.jpg` → `Living Room`. */
function labelFrom(filename: string): string {
  return filename
    .replace(/^\d+[-_]?/, "")
    .replace(/\.[^.]+$/, "")
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Ingests every image in `seed-data/placeholders/` and makes one hero segment
 * per file, in filename order. Idempotent: a segment whose label already exists
 * is left alone, so re-running never duplicates the strip.
 */
export async function seedHero(prisma: PrismaClient): Promise<void> {
  let files: string[];
  try {
    files = (await readdir(DIR)).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).sort();
  } catch {
    files = [];
  }

  if (files.length === 0) {
    console.log("No placeholder images found — see prisma/seed-data/placeholders/README.md");
    return;
  }

  const media = new MediaService(prisma as never, new LocalDiskStorage());

  for (const [index, file] of files.entries()) {
    const labelEn = labelFrom(file);
    if (await prisma.heroSegment.findFirst({ where: { labelEn } })) continue;

    const row = await media.ingest(
      { buffer: await readFile(join(DIR, file)), mimetype: "image/jpeg", originalname: file },
      { altEn: `${labelEn} interior`, altBn: `${labelEn} ইন্টেরিয়র` },
    );

    await prisma.heroSegment.create({
      data: {
        sortOrder: index,
        imageId: row.id,
        labelEn,
        // Placeholder: replaced in the admin. Never shown as a translation.
        labelBn: labelEn,
        active: true,
        // Spec §7: the mobile subset is curated, not sampled. First three by
        // default, because they still read as one walk; the editor changes it.
        showOnMobile: index < 3,
      },
    });
    console.log(`hero segment ${index}: ${labelEn}`);
  }
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedHero(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => void prisma.$disconnect());
}
```

Add to `apps/api/package.json` scripts:

```json
    "seed:hero": "tsx prisma/seed-hero.ts",
```

`ASSET-CHECKLIST.md` at the repo root:

```markdown
# Asset checklist

Every image slot the site has, and whether it is filled. Spec §15.

Placeholders are free-licence (Unsplash / Pexels) and every one records its
source URL and licence below. A slot with no row is an empty slot — the site is
built to render without it, not to break.

**The single highest-value ask of the client:** six photographs of one completed
flat, shot in sequence room to room at a consistent time of day. That one set
turns the hero from a convincing composite into the company's actual work.

| Slot | Needed | Have | Spec | Notes |
|---|---|---|---|---|
| Hero segments — background | 6 | 0 | 1920×1080, ≤180 KB AVIF, consistent colour temperature | `apps/api/prisma/seed-data/placeholders/` → `pnpm seed:hero` |
| Hero segments — foreground | 6 | 0 | transparent PNG/WebP — column, plant, curtain | Optional; the strip renders without them, with only the mask hiding each seam |
| Service covers | 7 | 0 | 1440×960 | One per seeded service |
| Project covers | 12+ | 0 | 1440×960 | Blocked with the project rows — see the profile PDF note below |
| Project galleries | 6–10 each | 0 | 1920×1280 | |
| Logo | 1 | 0 | SVG preferred; only a raster Facebook avatar exists today | |
| Team photos | as available | 0 | 800×800 | Team seeds empty and the section hides (spec §12) |
| Credential scans | 3 | 0 | trade license, VAT, TIN | Already inside the profile PDF |
| OG image | 1 | 0 | 1200×630 | Falls back to a generated title card until supplied |

## Blocked on the company profile PDF

The PDF is not in this repository. Until it lands, the following stay empty and
their sections hide rather than render invented content (spec §12):

- 73 corporate and 57 residential client rows — `apps/api/prisma/seed-data/`
- Vision / Mission / Values / Strengths / Philosophy copy — `apps/web/messages/*.json`
- The six key strengths behind the "How we work" section — `home.processTitle`
- Service descriptive copy — currently restates each title and claims nothing more

## Per-file licence record

| File | Source | Licence | Added |
|---|---|---|---|
| _(none yet)_ | | | |
```

- [ ] **Step 10: Verify the pipeline runs with an empty directory**

```bash
pnpm db:start
pnpm --filter @homeinn/api seed:hero
```
Expected: `No placeholder images found — see prisma/seed-data/placeholders/README.md`, exit 0. The hero renders its text-only variant, which the unit test already covers.

- [ ] **Step 11: Full check**

```bash
pnpm --filter @homeinn/web test
pnpm --filter @homeinn/web build
pnpm typecheck
```

- [ ] **Step 12: Commit**

```bash
git add apps/web apps/api ASSET-CHECKLIST.md
git commit -m "feat(web): add the scroll panorama hero and its reduced-motion path"
```

---

## Task 11: Home page — statement, services, working areas

**Files:**
- Create: `apps/web/components/sections/section.tsx`
- Create: `apps/web/components/sections/statement.tsx`, `statement.test.tsx`
- Create: `apps/web/components/sections/services-grid.tsx`, `services-grid.test.tsx`
- Create: `apps/web/components/sections/working-areas.tsx`, `working-areas.test.tsx`
- Create: `apps/web/lib/icons.ts`, `apps/web/lib/icons.test.ts`
- Create: `apps/web/hooks/use-reveal.ts`
- Modify: `apps/web/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `getSettings`, `getServices`, `getWorkingAreas`, `getHero` from `@/lib/content`; `text` from `@/lib/locale-text`; `Link` from `@/i18n/navigation`.
- Produces:
  - `<Section eyebrow title numeral tone children />` — `tone: "ink" | "bone"`, the alternating ground from §8
  - `<Statement locale settings />`, `<ServicesGrid locale services />`, `<WorkingAreas locale areas />`
  - `iconFor(name: string): LucideIcon`
  - `useReveal(): { ref, revealed }`

- [ ] **Step 1: Write the failing tests**

`apps/web/lib/icons.test.ts`:

```ts
import { Sofa } from "lucide-react";
import { describe, expect, it } from "vitest";
import { iconFor } from "./icons";

describe("iconFor", () => {
  it("maps every icon name the seed uses", () => {
    // apps/api/prisma/seed-data/services.ts — these seven, exactly.
    for (const name of ["sofa", "paintbrush", "building", "ruler", "box", "blinds", "cooking-pot"]) {
      expect(iconFor(name)).toBeTypeOf("function");
    }
  });

  it("resolves a known name to its icon", () => {
    expect(iconFor("sofa")).toBe(Sofa);
  });

  it("falls back rather than crashing on an unknown name", () => {
    expect(iconFor("not-a-real-icon")).toBeTypeOf("function");
  });
});
```

`apps/web/components/sections/statement.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl, settingsFixture } from "@/test/render";
import { Statement } from "./statement";

describe("Statement", () => {
  it("shows the three headline counts from settings", () => {
    // Spec §12: only stats that trace to the profile document.
    renderWithIntl(<Statement locale="en" settings={settingsFixture} />);
    expect(screen.getByText("73")).toBeInTheDocument();
    expect(screen.getByText("57")).toBeInTheDocument();
    expect(screen.getByText("13")).toBeInTheDocument();
  });

  it("labels each count", () => {
    renderWithIntl(<Statement locale="en" settings={settingsFixture} />);
    expect(screen.getByText("corporate projects")).toBeInTheDocument();
    expect(screen.getByText("residential projects")).toBeInTheDocument();
    expect(screen.getByText("districts")).toBeInTheDocument();
  });

  it("never claims clients where the source says projects", () => {
    // Spec §2's counting rule: the corporate list repeats clients across sites.
    renderWithIntl(<Statement locale="en" settings={settingsFixture} />);
    expect(screen.queryByText(/corporate clients/i)).not.toBeInTheDocument();
  });
});
```

`apps/web/components/sections/services-grid.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ServiceView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { ServicesGrid } from "./services-grid";

function service(over: Partial<ServiceView> = {}): ServiceView {
  return {
    id: "s1", slug: "interior-design-implementation",
    titleEn: "Interior Design & Implementation", titleBn: "ইন্টেরিয়র ডিজাইন ও বাস্তবায়ন",
    summaryEn: "From drawing to finished space.", summaryBn: "ড্রয়িং থেকে সম্পূর্ণ কাজ।",
    bodyEn: "<p>x</p>", bodyBn: "<p>x</p>",
    icon: "paintbrush", sortOrder: 0, published: true, cover: null,
    ...over,
  };
}

describe("ServicesGrid", () => {
  it("links each service to its detail page", () => {
    renderWithIntl(<ServicesGrid locale="en" services={[service()]} />);
    expect(screen.getByRole("link", { name: /Interior Design/ }))
      .toHaveAttribute("href", "/en/services/interior-design-implementation");
  });

  it("shows Bangla titles and summaries for bn", () => {
    renderWithIntl(<ServicesGrid locale="bn" services={[service()]} />, { locale: "bn" });
    expect(screen.getByText("ইন্টেরিয়র ডিজাইন ও বাস্তবায়ন")).toBeInTheDocument();
    expect(screen.getByText("ড্রয়িং থেকে সম্পূর্ণ কাজ।")).toBeInTheDocument();
  });

  it("renders an empty-state message rather than an empty grid", () => {
    renderWithIntl(<ServicesGrid locale="en" services={[]} />);
    expect(screen.getByText(/Services are being published/)).toBeInTheDocument();
  });

  it("hides decorative icons from assistive technology", () => {
    const { container } = renderWithIntl(<ServicesGrid locale="en" services={[service()]} />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
```

`apps/web/components/sections/working-areas.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WorkingAreaView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { WorkingAreas } from "./working-areas";

const areas: WorkingAreaView[] = [
  { id: "w1", slug: "corporate-office-bank-furniture", nameEn: "Corporate Office & Bank Furniture", nameBn: "কর্পোরেট অফিস ও ব্যাংক ফার্নিচার", sortOrder: 0 },
  { id: "w2", slug: "landscaping", nameEn: "Landscaping", nameBn: "ল্যান্ডস্কেপিং", sortOrder: 1 },
];

describe("WorkingAreas", () => {
  it("links each area into the filtered project grid", () => {
    renderWithIntl(<WorkingAreas locale="en" areas={areas} />);
    expect(screen.getByRole("link", { name: "Landscaping" }))
      .toHaveAttribute("href", "/en/projects?area=landscaping");
  });

  it("numbers the areas", () => {
    renderWithIntl(<WorkingAreas locale="en" areas={areas} />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  it("renders Bangla names for bn", () => {
    renderWithIntl(<WorkingAreas locale="bn" areas={areas} />, { locale: "bn" });
    expect(screen.getByText("ল্যান্ডস্কেপিং")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and watch them fail**

```bash
pnpm --filter @homeinn/web test
```
Expected: FAIL — four unresolved modules.

- [ ] **Step 3: Implement the icon map**

`apps/web/lib/icons.ts`:

```ts
import {
  Blinds, Box, Building, CookingPot, Paintbrush, Ruler, Sofa, Sparkles, type LucideIcon,
} from "lucide-react";

/**
 * `Service.icon` holds a lucide name chosen in the CMS. Mapping explicitly
 * rather than importing the whole icon set keeps the bundle to the eight icons
 * this site actually renders.
 */
const ICONS: Record<string, LucideIcon> = {
  sofa: Sofa,
  paintbrush: Paintbrush,
  building: Building,
  ruler: Ruler,
  box: Box,
  blinds: Blinds,
  "cooking-pot": CookingPot,
};

export function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? Sparkles;
}
```

- [ ] **Step 4: Implement the reveal hook and the section shell**

`apps/web/hooks/use-reveal.ts`:

```ts
"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

/**
 * Reveals an element the first time it enters the viewport. The whole animation
 * is a CSS transition on the returned flag — no animation runtime, which is what
 * keeps the §7 performance budget reachable on a mid-range Android over 4G.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const reduced = usePrefersReducedMotion();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (reduced) {
      setRevealed(true);
      return;
    }
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [reduced]);

  return { ref, revealed };
}
```

`apps/web/components/sections/section.tsx`:

```tsx
import type { ReactNode } from "react";

interface SectionProps {
  /** Two-digit numeral. Spec §8 lists section numerals as a sanctioned use of brand. */
  numeral?: string;
  eyebrow?: string;
  title?: string;
  /** §8: immersive sections sit on ink, content-dense ones on bone. */
  tone?: "ink" | "bone";
  id?: string;
  children: ReactNode;
}

export function Section({ numeral, eyebrow, title, tone = "bone", id, children }: SectionProps) {
  const ground = tone === "ink" ? "bg-ink text-sand" : "bg-bone text-ink";

  return (
    <section id={id} className={`${ground} py-20 md:py-28`}>
      <div className="mx-auto max-w-7xl px-5">
        {(numeral || eyebrow || title) && (
          <header className="mb-12 max-w-3xl">
            <div className="flex items-baseline gap-4">
              {numeral ? <span className="section-numeral">{numeral}</span> : null}
              {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            </div>
            {title ? <h2 className="display-2 mt-4">{title}</h2> : null}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Implement the three sections**

`apps/web/components/sections/statement.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import type { SiteSettingsView } from "@/lib/api.types";
import { Section } from "./section";

/**
 * Spec §6 section 2. Every number here comes from `SiteSettings`, which the
 * seed fills from the profile's own figures — and the label says "projects",
 * never "clients", because the corporate list repeats clients across sites
 * (spec §2's counting rule).
 */
export function Statement({ locale, settings }: { locale: Locale; settings: SiteSettingsView }) {
  const t = useTranslations("home");

  const stats = [
    { value: settings.corporateProjectCount, label: t("statCorporate") },
    { value: settings.residentialProjectCount, label: t("statResidential") },
    { value: settings.districtCount, label: t("statDistricts") },
  ];

  return (
    <Section numeral="01" eyebrow={t("statementEyebrow")} tone="bone" id="main">
      <p className="display-2 max-w-4xl">{t("statementTitle")}</p>
      <p className="mt-6 max-w-2xl text-lg text-ink/70">{t("statementBody")}</p>

      <dl className="mt-16 grid gap-10 border-t border-ink/10 pt-10 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="sr-only">{stat.label}</dt>
            <dd>
              <span className="display-1 block leading-none">
                {new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US").format(stat.value)}
              </span>
              <span className="eyebrow mt-3 block text-ink/50">{stat.label}</span>
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
```

The statement test asserts `getByText("73")`. `Intl.NumberFormat("en-US")` renders `73`; the Bangla locale renders `৭৩`, which is correct and is why the assertion runs in English.

`apps/web/components/sections/services-grid.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ServiceView } from "@/lib/api.types";
import { iconFor } from "@/lib/icons";
import { text } from "@/lib/locale-text";
import { Section } from "./section";

export function ServicesGrid({ locale, services }: { locale: Locale; services: ServiceView[] }) {
  const t = useTranslations("home");
  const s = useTranslations("services");

  return (
    <Section numeral="02" eyebrow={t("servicesEyebrow")} title={t("servicesTitle")} tone="bone">
      {services.length === 0 ? (
        <p className="text-ink/60">{s("empty")}</p>
      ) : (
        <ul className="grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = iconFor(service.icon);
            return (
              <li key={service.id} className="bg-bone">
                <Link
                  href={`/services/${service.slug}`}
                  className="flex h-full flex-col gap-4 p-8 transition-colors hover:bg-sand/40"
                >
                  <Icon aria-hidden="true" className="size-7 text-walnut" />
                  <h3 className="heading">{text(service, "title", locale)}</h3>
                  <p className="text-sm text-ink/70">{text(service, "summary", locale)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
```

`apps/web/components/sections/working-areas.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { WorkingAreaView } from "@/lib/api.types";
import { text } from "@/lib/locale-text";
import { Section } from "./section";

/**
 * Spec §6: working areas are a filter dimension on /projects, not their own
 * page — so every entry here is a link into the filtered grid.
 */
export function WorkingAreas({ locale, areas }: { locale: Locale; areas: WorkingAreaView[] }) {
  const t = useTranslations("home");

  return (
    <Section numeral="03" eyebrow={t("areasEyebrow")} title={t("areasTitle")} tone="ink">
      <ul className="divide-y divide-ink-line border-y border-ink-line">
        {areas.map((area, index) => (
          <li key={area.id}>
            <Link
              href={`/projects?area=${area.slug}`}
              className="group flex items-baseline gap-6 py-5 transition-colors hover:text-brand"
            >
              <span className="section-numeral">{String(index + 1).padStart(2, "0")}</span>
              <span className="heading">{text(area, "name", locale)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
```

- [ ] **Step 6: Assemble what exists of the home page**

`apps/web/app/[locale]/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { PanoramaHero } from "@/components/hero/panorama-hero";
import { ServicesGrid } from "@/components/sections/services-grid";
import { Statement } from "@/components/sections/statement";
import { WorkingAreas } from "@/components/sections/working-areas";
import type { Locale } from "@homeinn/types";
import { getHero, getServices, getSettings, getWorkingAreas } from "@/lib/content";

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [hero, settings, services, areas] = await Promise.all([
    getHero("desktop"),
    getSettings(),
    getServices(),
    getWorkingAreas(),
  ]);

  return (
    <main>
      <PanoramaHero segments={hero} locale={locale} target="desktop" />
      <Statement locale={locale} settings={settings} />
      <ServicesGrid locale={locale} services={services} />
      <WorkingAreas locale={locale} areas={areas} />
    </main>
  );
}
```

The mobile strip is a separate fetch and Task 12 adds it; for now desktop segments render on both, which the sticky layout handles.

- [ ] **Step 7: Run and watch them pass**

```bash
pnpm --filter @homeinn/web test
pnpm typecheck
```
Expected: PASS — 13 new tests.

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "feat(web): add the statement, services, and working-area sections"
```

---

## Task 12: Home page — projects, track record, credentials, and the sections that hide

**Files:**
- Create: `apps/web/components/sections/selected-projects.tsx`, `selected-projects.test.tsx`
- Create: `apps/web/components/sections/track-record.tsx`, `track-record.test.tsx`
- Create: `apps/web/components/sections/process.tsx`, `process.test.tsx`
- Create: `apps/web/components/sections/testimonials.tsx`, `testimonials.test.tsx`
- Create: `apps/web/components/sections/credentials.tsx`, `credentials.test.tsx`
- Create: `apps/web/components/project-card.tsx`
- Modify: `apps/web/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `getProjects`, `getCorporateClients`, `getTestimonials`, `getCertifications` from `@/lib/content`; `Marquee` from `@homeinn/ui`.
- Produces: `<SelectedProjects>`, `<TrackRecord>`, `<Process>`, `<Testimonials>`, `<Credentials>`, `<ProjectCard>`.

This is where spec §12 is enforced in code. Three of these five sections render nothing at all today, and that is the correct output — not a bug to work around.

- [ ] **Step 1: Write the failing tests**

`apps/web/components/sections/selected-projects.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProjectView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { SelectedProjects } from "./selected-projects";

function project(over: Partial<ProjectView> = {}): ProjectView {
  return {
    id: "p1", slug: "bfidc-head-office",
    titleEn: "BFIDC Head Office", titleBn: "বিএফআইডিসি প্রধান কার্যালয়",
    clientName: null,
    locationEn: "Dhaka", locationBn: "ঢাকা",
    areaSqft: 4200, year: 2024,
    descriptionEn: "<p>x</p>", descriptionBn: "<p>x</p>",
    workingAreaId: "w1", featured: true, published: true, sortOrder: 0, cover: null,
    ...over,
  };
}

describe("SelectedProjects", () => {
  it("renders nothing at all when no case studies are published", () => {
    // Spec §12: project case studies stay unpublished until the client confirms
    // the details, so the section must disappear rather than show an empty grid.
    const { container } = renderWithIntl(<SelectedProjects locale="en" projects={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows at most four", () => {
    const many = Array.from({ length: 7 }, (_, i) => project({ id: `p${i}`, slug: `p-${i}` }));
    renderWithIntl(<SelectedProjects locale="en" projects={many} />);
    expect(screen.getAllByRole("article")).toHaveLength(4);
  });

  it("links each card to its case study", () => {
    renderWithIntl(<SelectedProjects locale="en" projects={[project()]} />);
    expect(screen.getByRole("link", { name: /BFIDC Head Office/ }))
      .toHaveAttribute("href", "/en/projects/bfidc-head-office");
  });

  it("shows the location and year", () => {
    renderWithIntl(<SelectedProjects locale="en" projects={[project()]} />);
    expect(screen.getByText(/Dhaka/)).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });
});
```

`apps/web/components/sections/track-record.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CorporateClientView } from "@/lib/api.types";
import { renderWithIntl, settingsFixture } from "@/test/render";
import { TrackRecord } from "./track-record";

const flagship: CorporateClientView = {
  id: "c1", serial: 1, companyName: "BFIDC", address: "Dhaka",
  isFlagship: true, needsVerification: false,
};
const ordinary: CorporateClientView = {
  id: "c2", serial: 2, companyName: "Some Company Ltd", address: "Dhaka",
  isFlagship: false, needsVerification: false,
};

describe("TrackRecord", () => {
  it("still states the real counts when the client table is empty", () => {
    // The 73/57/13 figures are in spec §2; the row-level tables are blocked on
    // the profile PDF. The section must stay truthful without them.
    renderWithIntl(<TrackRecord locale="en" settings={settingsFixture} clients={[]} />);
    expect(screen.getByText(/73/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See the full track record/ }))
      .toHaveAttribute("href", "/en/clients");
  });

  it("surfaces only the flagship references when rows exist", () => {
    renderWithIntl(
      <TrackRecord locale="en" settings={settingsFixture} clients={[flagship, ordinary]} />);
    expect(screen.getAllByText("BFIDC").length).toBeGreaterThan(0);
    expect(screen.queryByText("Some Company Ltd")).not.toBeInTheDocument();
  });

  it("falls back to the counts when rows exist but none are flagged", () => {
    renderWithIntl(<TrackRecord locale="en" settings={settingsFixture} clients={[ordinary]} />);
    expect(screen.queryByText("Some Company Ltd")).not.toBeInTheDocument();
    expect(screen.getByText(/73/)).toBeInTheDocument();
  });
});
```

`apps/web/components/sections/process.test.tsx`:

```tsx
import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import { Process } from "./process";

function renderWith(messages: Record<string, unknown>) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <Process />
    </NextIntlClientProvider>,
  );
}

describe("Process", () => {
  it("renders nothing while the copy source is missing", () => {
    // home.processTitle is empty in both catalogues: its source is the profile
    // PDF's six key strengths, which is not in this repository (spec §12).
    const { container } = renderWith(en);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders once the copy is written", () => {
    renderWith({ ...en, home: { ...en.home, processTitle: "Six steps, every time." } });
    expect(screen.getByText("Six steps, every time.")).toBeInTheDocument();
  });
});
```

`apps/web/components/sections/testimonials.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TestimonialView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { Testimonials } from "./testimonials";

const quote: TestimonialView = {
  id: "t1", authorName: "A Client",
  roleEn: "Managing Director", roleBn: "ব্যবস্থাপনা পরিচালক",
  quoteEn: "They finished on time.", quoteBn: "তাঁরা সময়মতো শেষ করেছেন।",
  rating: 5, avatar: null, sortOrder: 0,
};

describe("Testimonials", () => {
  it("renders nothing when there are none", () => {
    // Spec §12: no invented quotes, no stock-photo customers. The table seeds
    // empty and the section does not render.
    const { container } = renderWithIntl(<Testimonials locale="en" testimonials={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders real quotes when they exist", () => {
    renderWithIntl(<Testimonials locale="en" testimonials={[quote]} />);
    expect(screen.getByText(/They finished on time/)).toBeInTheDocument();
    expect(screen.getByText("A Client")).toBeInTheDocument();
  });
});
```

`apps/web/components/sections/credentials.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CertificationView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { Credentials } from "./credentials";

const vat: CertificationView = {
  id: "c1", titleEn: "VAT Registration", titleBn: "ভ্যাট নিবন্ধন",
  issuer: "National Board of Revenue", reference: "BIN 001489494-0804",
  document: null, sortOrder: 1,
};

describe("Credentials", () => {
  it("shows the credential, its issuer and its reference", () => {
    renderWithIntl(<Credentials locale="en" certifications={[vat]} />);
    expect(screen.getByText("VAT Registration")).toBeInTheDocument();
    expect(screen.getByText(/National Board of Revenue/)).toBeInTheDocument();
    expect(screen.getByText(/BIN 001489494-0804/)).toBeInTheDocument();
  });

  it("renders nothing when none are recorded", () => {
    const { container } = renderWithIntl(<Credentials locale="en" certifications={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run and watch them fail**

```bash
pnpm --filter @homeinn/web test
```
Expected: FAIL — five unresolved modules.

- [ ] **Step 3: Implement the project card**

`apps/web/components/project-card.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ProjectView } from "@/lib/api.types";
import { Picture } from "@/components/media/picture";
import { text } from "@/lib/locale-text";

export function ProjectCard({ locale, project }: { locale: Locale; project: ProjectView }) {
  const t = useTranslations("projects");

  return (
    <article className="group">
      <Link href={`/projects/${project.slug}`} className="block">
        <div className="aspect-[4/3] overflow-hidden bg-ink-raised">
          {project.cover ? (
            <Picture
              media={project.cover}
              locale={locale}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : null}
        </div>
        <h3 className="heading mt-4">{text(project, "title", locale)}</h3>
        <p className="mt-1 text-sm text-current/60">
          {text(project, "location", locale)}
          {project.year ? ` · ${project.year}` : ""}
          {project.areaSqft ? ` · ${project.areaSqft} ${t("areaUnit")}` : ""}
        </p>
      </Link>
    </article>
  );
}
```

`project.clientName` is deliberately never rendered on a card. Spec §11 permits corporate names but the field is shared with residential case studies, and a card has no way to know which it is holding; the detail page decides, where the working area is available.

- [ ] **Step 4: Implement the five sections**

`apps/web/components/sections/selected-projects.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ProjectView } from "@/lib/api.types";
import { ProjectCard } from "@/components/project-card";
import { Section } from "./section";

const MAX = 4;

/**
 * Spec §6 section 5. The API already sorts featured rows first, so taking the
 * first four gives the featured set when one exists and the newest work when it
 * does not. Renders nothing while no case study is published (spec §12).
 */
export function SelectedProjects({
  locale,
  projects,
}: {
  locale: Locale;
  projects: ProjectView[];
}) {
  const t = useTranslations("home");
  const common = useTranslations("common");

  if (projects.length === 0) return null;

  return (
    <Section numeral="04" eyebrow={t("projectsEyebrow")} title={t("projectsTitle")} tone="ink">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {projects.slice(0, MAX).map((project) => (
          <ProjectCard key={project.id} locale={locale} project={project} />
        ))}
      </div>
      <Link href="/projects" className="mt-12 inline-block text-brand underline-offset-4 hover:underline">
        {common("viewAll")}
      </Link>
    </Section>
  );
}
```

`apps/web/components/sections/track-record.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { Marquee } from "@homeinn/ui";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CorporateClientView, SiteSettingsView } from "@/lib/api.types";
import { Section } from "./section";

/**
 * Spec §6 section 6. The 73/57/13 counts are stated in the profile and seeded;
 * the row-level client tables are not in this repository yet. So the section is
 * built to be true either way: counts always, flagship names when they exist.
 *
 * Only `isFlagship` rows are ever surfaced here — spec §2 lists those seven by
 * name as the references worth showing, and a 73-row marquee is noise.
 */
export function TrackRecord({
  locale,
  settings,
  clients,
}: {
  locale: Locale;
  settings: SiteSettingsView;
  clients: CorporateClientView[];
}) {
  const t = useTranslations("home");
  const c = useTranslations("clients");
  const format = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US");
  const flagship = clients.filter((client) => client.isFlagship);

  return (
    <Section numeral="05" eyebrow={t("trackRecordEyebrow")} title={t("trackRecordTitle")} tone="bone">
      <p className="max-w-2xl text-lg text-ink/70">{t("trackRecordBody")}</p>

      <p className="display-2 mt-10">
        {format.format(settings.corporateProjectCount)} + {format.format(settings.residentialProjectCount)}
      </p>

      {flagship.length > 0 ? (
        <div className="mt-12 border-y border-ink/10 py-6">
          <p className="eyebrow mb-4 text-ink/50">{c("flagship")}</p>
          <Marquee speedSeconds={50}>
            {flagship.map((client) => (
              <span key={client.id} className="heading whitespace-nowrap text-ink/70">
                {client.companyName}
              </span>
            ))}
          </Marquee>
        </div>
      ) : null}

      <Link href="/clients" className="mt-12 inline-block text-brand underline-offset-4 hover:underline">
        {t("trackRecordCta")}
      </Link>
    </Section>
  );
}
```

`apps/web/components/sections/process.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { Section } from "./section";

/**
 * Spec §6 section 7 — the process derived from the profile's six key strengths.
 * That copy lives in the company profile PDF, which is not in this repository,
 * so both catalogues carry `home.processTitle` as an empty string and this
 * section renders nothing. Fill the key in `messages/{en,bn}.json` and it
 * appears. Spec §12: no invented copy.
 */
export function Process() {
  const t = useTranslations("home");
  const title = t("processTitle");

  if (!title.trim()) return null;

  return (
    <Section numeral="06" eyebrow={t("processEyebrow")} title={title} tone="ink">
      {null}
    </Section>
  );
}
```

`apps/web/components/sections/testimonials.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import type { TestimonialView } from "@/lib/api.types";
import { text, textOrNull } from "@/lib/locale-text";
import { Section } from "./section";

/**
 * Spec §12: no testimonials exist, none are invented, and the section does not
 * render when the table is empty. The markup below is what appears the day the
 * client supplies real ones.
 */
export function Testimonials({
  locale,
  testimonials,
}: {
  locale: Locale;
  testimonials: TestimonialView[];
}) {
  const t = useTranslations("home");

  if (testimonials.length === 0) return null;

  return (
    <Section numeral="07" eyebrow={t("testimonialsEyebrow")} title={t("testimonialsTitle")} tone="ink">
      <ul className="grid gap-10 md:grid-cols-2">
        {testimonials.map((item) => {
          const role = textOrNull(item, "role", locale);
          return (
            <li key={item.id} className="border border-ink-line p-8">
              <blockquote className="text-lg text-sand">{text(item, "quote", locale)}</blockquote>
              <p className="mt-6 text-sand">{item.authorName}</p>
              {role ? <p className="text-sm text-sand-dim">{role}</p> : null}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
```

`apps/web/components/sections/credentials.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import type { CertificationView } from "@/lib/api.types";
import { text } from "@/lib/locale-text";
import { Section } from "./section";

export function Credentials({
  locale,
  certifications,
}: {
  locale: Locale;
  certifications: CertificationView[];
}) {
  const t = useTranslations("home");

  if (certifications.length === 0) return null;

  return (
    <Section numeral="08" eyebrow={t("credentialsEyebrow")} title={t("credentialsTitle")} tone="bone">
      <ul className="grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-3">
        {certifications.map((certification) => (
          <li key={certification.id} className="bg-bone p-8">
            <h3 className="heading">{text(certification, "title", locale)}</h3>
            {certification.issuer ? (
              <p className="mt-2 text-sm text-ink/60">{certification.issuer}</p>
            ) : null}
            {certification.reference ? (
              <p className="mt-1 text-sm text-ink/60">{certification.reference}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}
```

- [ ] **Step 5: Extend the home page**

`apps/web/app/[locale]/page.tsx` — add the fetches and the sections:

```tsx
  const [hero, settings, services, areas, projects, clients, testimonials, certifications] =
    await Promise.all([
      getHero("desktop"),
      getSettings(),
      getServices(),
      getWorkingAreas(),
      getProjects(),
      getCorporateClients(),
      getTestimonials(),
      getCertifications(),
    ]);
```
```tsx
      <SelectedProjects locale={locale} projects={projects} />
      <TrackRecord locale={locale} settings={settings} clients={clients} />
      <Process />
      <Testimonials locale={locale} testimonials={testimonials} />
      <Credentials locale={locale} certifications={certifications} />
```

- [ ] **Step 6: Run and watch them pass**

```bash
pnpm --filter @homeinn/web test
pnpm typecheck
```
Expected: PASS — 13 new tests.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): add the projects, track record, and credentials sections"
```

---

## Task 13: The lead form, the CTA section, and `/contact`

**Files:**
- Create: `apps/web/lib/leads.ts`, `apps/web/lib/leads.test.ts`
- Create: `apps/web/components/forms/lead-form.tsx`, `lead-form.test.tsx`
- Create: `apps/web/components/sections/cta.tsx`
- Create: `apps/web/app/[locale]/contact/page.tsx`
- Modify: `apps/web/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `createLeadSchema` from `@homeinn/types` — the same schema the API validates with, which is the entire point of §4's "Zod as the contract".
- Produces:
  - `submitLead(input): Promise<LeadResult>` where `LeadResult = { ok: true } | { ok: false; reason: "throttled" | "invalid" | "network" }`
  - `<LeadForm locale services defaultType sourcePath />`
  - `<Cta locale services />`

The form posts from the browser directly to `POST /api/leads`. Routing it through a Next Server Action would make every visitor share the Next server's IP against a 5/hour/IP throttle.

- [ ] **Step 1: Write the failing tests**

`apps/web/lib/leads.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { submitLead } from "./leads";

const valid = {
  type: "CONSULTATION" as const,
  name: "Rahim",
  phone: "01760775454",
  locale: "bn" as const,
};

function stubFetch(status: number) {
  const spy = vi.fn(async () => ({ ok: status < 400, status, json: async () => ({}) }));
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => vi.unstubAllGlobals());

describe("submitLead", () => {
  it("posts to the API directly, not through the Next server", async () => {
    const spy = stubFetch(201);
    await submitLead(valid);
    expect(spy.mock.calls[0]?.[0]).toBe("http://localhost:4000/api/leads");
    expect((spy.mock.calls[0]?.[1] as RequestInit).method).toBe("POST");
  });

  it("normalises the phone number before sending", async () => {
    const spy = stubFetch(201);
    await submitLead({ ...valid, phone: "+880 1760-775 454" });
    const body = JSON.parse((spy.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body.phone).toBe("01760775454");
  });

  it("rejects an invalid phone number without calling the API", async () => {
    const spy = stubFetch(201);
    const result = await submitLead({ ...valid, phone: "12345" });
    expect(result).toEqual({ ok: false, reason: "invalid" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("reports a 429 as throttled, not as a generic failure", async () => {
    stubFetch(429);
    await expect(submitLead(valid)).resolves.toEqual({ ok: false, reason: "throttled" });
  });

  it("reports any other failure as network", async () => {
    stubFetch(500);
    await expect(submitLead(valid)).resolves.toEqual({ ok: false, reason: "network" });
  });

  it("succeeds on a 201", async () => {
    stubFetch(201);
    await expect(submitLead(valid)).resolves.toEqual({ ok: true });
  });
});
```

`apps/web/components/forms/lead-form.test.tsx`:

```tsx
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { LeadForm } from "./lead-form";

function stubFetch(status: number) {
  const spy = vi.fn(async () => ({ ok: status < 400, status, json: async () => ({}) }));
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => vi.unstubAllGlobals());

describe("LeadForm", () => {
  it("submits name, phone and type", async () => {
    const spy = stubFetch(201);
    renderWithIntl(<LeadForm locale="en" services={[]} sourcePath="/en" />);

    await userEvent.type(screen.getByLabelText(/Your name/), "Rahim");
    await userEvent.type(screen.getByLabelText(/Mobile number/), "01760775454");
    await userEvent.click(screen.getByRole("button", { name: "Send enquiry" }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const body = JSON.parse((spy.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body).toMatchObject({ name: "Rahim", phone: "01760775454", locale: "en", sourcePath: "/en" });
  });

  it("shows a success message and clears the form", async () => {
    stubFetch(201);
    renderWithIntl(<LeadForm locale="en" services={[]} sourcePath="/en" />);

    await userEvent.type(screen.getByLabelText(/Your name/), "Rahim");
    await userEvent.type(screen.getByLabelText(/Mobile number/), "01760775454");
    await userEvent.click(screen.getByRole("button", { name: "Send enquiry" }));

    expect(await screen.findByText(/Thank you/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Your name/)).toHaveValue("");
  });

  it("rejects a bad phone number in the browser, before the request", async () => {
    const spy = stubFetch(201);
    renderWithIntl(<LeadForm locale="en" services={[]} sourcePath="/en" />);

    await userEvent.type(screen.getByLabelText(/Your name/), "Rahim");
    await userEvent.type(screen.getByLabelText(/Mobile number/), "12345");
    await userEvent.click(screen.getByRole("button", { name: "Send enquiry" }));

    expect(await screen.findByText(/valid Bangladeshi mobile number/)).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("explains a throttled submission instead of blaming the visitor", async () => {
    stubFetch(429);
    renderWithIntl(<LeadForm locale="en" services={[]} sourcePath="/en" />);

    await userEvent.type(screen.getByLabelText(/Your name/), "Rahim");
    await userEvent.type(screen.getByLabelText(/Mobile number/), "01760775454");
    await userEvent.click(screen.getByRole("button", { name: "Send enquiry" }));

    expect(await screen.findByText(/several enquiries from this connection/)).toBeInTheDocument();
  });

  it("announces its status to assistive technology", async () => {
    stubFetch(201);
    renderWithIntl(<LeadForm locale="en" services={[]} sourcePath="/en" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders its labels in Bangla for bn", () => {
    renderWithIntl(<LeadForm locale="bn" services={[]} sourcePath="/bn" />, { locale: "bn" });
    expect(screen.getByLabelText(/আপনার নাম/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and watch them fail**

```bash
pnpm --filter @homeinn/web test -- lead
```
Expected: FAIL — two unresolved modules.

- [ ] **Step 3: Implement the submitter**

`apps/web/lib/leads.ts`:

```ts
import { createLeadSchema, type CreateLeadInput } from "@homeinn/types";
import { apiBaseUrl } from "./env";

export type LeadResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "throttled" | "network" };

/**
 * Posts a lead from the browser straight to the API.
 *
 * Deliberately not a Server Action: `POST /api/leads` is capped at 5 per hour
 * per IP, and proxying through the Next server would put every visitor in the
 * country behind one IP and one shared budget.
 *
 * Validation uses the API's own schema, so the phone normalisation the server
 * applies (+880 → 0, separators stripped) happens identically here.
 */
export async function submitLead(input: unknown): Promise<LeadResult> {
  const parsed = createLeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  let response: { ok: boolean; status: number };
  try {
    response = await fetch(`${apiBaseUrl()}/leads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data satisfies CreateLeadInput),
    });
  } catch {
    return { ok: false, reason: "network" };
  }

  if (response.ok) return { ok: true };
  if (response.status === 429) return { ok: false, reason: "throttled" };
  return { ok: false, reason: "network" };
}
```

- [ ] **Step 4: Implement the form**

`apps/web/components/forms/lead-form.tsx`:

```tsx
"use client";

import type { Locale } from "@homeinn/types";
import { Button, Input, Label, Textarea } from "@homeinn/ui";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import type { ServiceView } from "@/lib/api.types";
import { submitLead } from "@/lib/leads";
import { text } from "@/lib/locale-text";

type Status = "idle" | "submitting" | "success" | "invalid" | "throttled" | "network";

interface LeadFormProps {
  locale: Locale;
  services: ServiceView[];
  sourcePath: string;
  defaultType?: "CONTACT" | "CONSULTATION" | "QUOTE";
}

export function LeadForm({ locale, services, sourcePath, defaultType = "CONSULTATION" }: LeadFormProps) {
  const t = useTranslations("form");
  const [status, setStatus] = useState<Status>("idle");
  const [key, setKey] = useState(0); // remounts the fields to clear them on success

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus("submitting");

    const result = await submitLead({
      type: data.get("type"),
      name: data.get("name"),
      phone: data.get("phone"),
      email: (data.get("email") as string) || undefined,
      message: (data.get("message") as string) || undefined,
      serviceId: (data.get("serviceId") as string) || undefined,
      sourcePath,
      locale,
    });

    if (result.ok) {
      setStatus("success");
      setKey((n) => n + 1);
      return;
    }
    setStatus(result.reason);
  }

  const message = {
    idle: "",
    submitting: "",
    success: t("success"),
    invalid: t("errorPhone"),
    throttled: t("errorThrottled"),
    network: t("errorGeneric"),
  }[status];

  return (
    <form key={key} onSubmit={onSubmit} noValidate className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="lead-type">{t("type")}</Label>
        <select
          id="lead-type"
          name="type"
          defaultValue={defaultType}
          className="h-11 border border-current/20 bg-transparent px-3"
        >
          <option value="CONTACT">{t("typeContact")}</option>
          <option value="CONSULTATION">{t("typeConsultation")}</option>
          <option value="QUOTE">{t("typeQuote")}</option>
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="lead-name">{t("name")}</Label>
        <Input id="lead-name" name="name" required autoComplete="name" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="lead-phone">{t("phone")}</Label>
        <Input
          id="lead-phone"
          name="phone"
          required
          inputMode="tel"
          autoComplete="tel"
          aria-describedby="lead-phone-hint"
        />
        <p id="lead-phone-hint" className="text-xs text-current/60">{t("phoneHint")}</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="lead-email">{t("email")}</Label>
        <Input id="lead-email" name="email" type="email" autoComplete="email" />
      </div>

      {services.length > 0 ? (
        <div className="grid gap-2">
          <Label htmlFor="lead-service">{t("service")}</Label>
          <select
            id="lead-service"
            name="serviceId"
            defaultValue=""
            className="h-11 border border-current/20 bg-transparent px-3"
          >
            <option value="">{t("servicePlaceholder")}</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {text(service, "title", locale)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="lead-message">{t("message")}</Label>
        <Textarea id="lead-message" name="message" rows={4} />
      </div>

      <Button type="submit" size="lg" disabled={status === "submitting"}>
        {status === "submitting" ? t("submitting") : t("submit")}
      </Button>

      <p
        role="status"
        aria-live="polite"
        className={status === "success" ? "text-sm text-walnut" : "text-sm text-brand"}
      >
        {message}
      </p>
    </form>
  );
}
```

- [ ] **Step 5: Implement the CTA section and the contact page**

`apps/web/components/sections/cta.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import type { ServiceView, SiteSettingsView } from "@/lib/api.types";
import { LeadForm } from "@/components/forms/lead-form";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { Section } from "./section";

export function Cta({
  locale,
  services,
  settings,
}: {
  locale: Locale;
  services: ServiceView[];
  settings: SiteSettingsView;
}) {
  const t = useTranslations("home");
  const common = useTranslations("common");

  return (
    <Section numeral="09" eyebrow={t("ctaEyebrow")} title={t("ctaTitle")} tone="ink" id="enquire">
      <div className="grid gap-14 lg:grid-cols-2">
        <div>
          <p className="max-w-md text-lg text-sand-dim">{t("ctaBody")}</p>
          <div className="mt-8 flex items-center gap-4">
            <WhatsAppButton
              number={settings.whatsapp}
              className="inline-flex items-center gap-2 border border-sand px-5 py-3 text-sand hover:border-brand hover:text-brand"
            />
            <a href={`tel:${settings.phone}`} className="text-sand-dim hover:text-brand">
              {common("callUs")} — {settings.phone}
            </a>
          </div>
        </div>
        <div className="text-sand">
          <LeadForm locale={locale} services={services} sourcePath={`/${locale}`} />
        </div>
      </div>
    </Section>
  );
}
```

`apps/web/app/[locale]/contact/page.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LeadForm } from "@/components/forms/lead-form";
import { getServices, getSettings } from "@/lib/content";
import { text } from "@/lib/locale-text";

export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, services] = await Promise.all([getSettings(), getServices()]);
  const t = await getTranslations("contact");
  const common = await getTranslations("common");

  return (
    <main id="main" className="bg-bone">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 py-28 lg:grid-cols-2">
        <div>
          <h1 className="display-1">{t("title")}</h1>
          <p className="mt-6 max-w-md text-lg text-ink/70">{t("intro")}</p>

          <dl className="mt-12 space-y-6 text-sm">
            <div>
              <dt className="eyebrow text-ink/50">{common("address")}</dt>
              <dd className="mt-1">{text(settings, "address", locale)}</dd>
            </div>
            <div>
              <dt className="eyebrow text-ink/50">{common("callUs")}</dt>
              <dd className="mt-1">
                <a className="hover:text-brand" href={`tel:${settings.phone}`}>{settings.phone}</a>
              </dd>
            </div>
            <div>
              <dt className="eyebrow text-ink/50">{common("email")}</dt>
              <dd className="mt-1">
                <a className="hover:text-brand" href={`mailto:${settings.email}`}>{settings.email}</a>
              </dd>
            </div>
            <div>
              <dt className="eyebrow text-ink/50">{common("hours")}</dt>
              <dd className="mt-1">{text(settings, "hours", locale)}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h2 className="heading">{t("formTitle")}</h2>
          <div className="mt-6">
            <LeadForm
              locale={locale}
              services={services}
              sourcePath={`/${locale}/contact`}
              defaultType="CONTACT"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
```

Add `<Cta locale={locale} services={services} settings={settings} />` to `apps/web/app/[locale]/page.tsx`, after `<Credentials />`.

- [ ] **Step 6: Run and watch them pass**

```bash
pnpm --filter @homeinn/web test
pnpm typecheck
```
Expected: PASS — 12 new tests.

- [ ] **Step 7: Verify a real lead lands**

```bash
pnpm db:start
pnpm --filter @homeinn/api dev      # shell 1
pnpm --filter @homeinn/web dev      # shell 2
```
Submit the form at `http://localhost:3000/bn`, then:
```bash
psql "$DATABASE_URL" -c 'SELECT type, name, phone, locale, "sourcePath" FROM "Lead" ORDER BY "createdAt" DESC LIMIT 1;'
```
Expected: one row, `locale = bn`, `sourcePath = /bn`, the phone stored in `01…` form.

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "feat(web): add the lead form, cta section, and contact page"
```
---

## Task 14: `/services` and `/services/[slug]`

**Files:**
- Create: `apps/web/lib/rich-text.ts`, `apps/web/lib/rich-text.test.ts`
- Create: `apps/web/components/rich-text.tsx`
- Create: `apps/web/app/[locale]/services/page.tsx`
- Create: `apps/web/app/[locale]/services/[slug]/page.tsx`
- Modify: `apps/web/package.json`

**Interfaces:**
- Consumes: `getServices`, `getService` from `@/lib/content`; `ServicesGrid` from Task 11.
- Produces:
  - `sanitizeRichText(html: string): string`
  - `<RichText html className />`

`Service.bodyEn` / `bodyBn` hold HTML from the admin editor. Editors are authenticated and role-gated, so this is not an untrusted-input problem — but a stored-XSS bug in Plan 1C would become a public-site problem here, and an allowlist costs one dependency.

- [ ] **Step 1: Install the sanitiser**

```bash
pnpm --filter @homeinn/web add sanitize-html
pnpm --filter @homeinn/web add -D @types/sanitize-html
```

- [ ] **Step 2: Write the failing test**

`apps/web/lib/rich-text.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { sanitizeRichText } from "./rich-text";

describe("sanitizeRichText", () => {
  it("keeps the formatting an editor actually uses", () => {
    const html = "<p>A <strong>fitted</strong> <em>kitchen</em>.</p><ul><li>One</li></ul>";
    expect(sanitizeRichText(html)).toBe(html);
  });

  it("keeps links but forces them safe", () => {
    expect(sanitizeRichText('<a href="https://example.com">x</a>'))
      .toContain('rel="noreferrer noopener"');
  });

  it("strips a script tag", () => {
    expect(sanitizeRichText('<p>hi</p><script>alert(1)</script>')).toBe("<p>hi</p>");
  });

  it("strips an inline handler", () => {
    expect(sanitizeRichText('<p onclick="alert(1)">hi</p>')).toBe("<p>hi</p>");
  });

  it("strips a javascript: URL", () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript:");
  });

  it("survives empty input", () => {
    expect(sanitizeRichText("")).toBe("");
  });
});
```

- [ ] **Step 3: Run and watch it fail**

```bash
pnpm --filter @homeinn/web test -- rich-text
```
Expected: FAIL — `./rich-text` unresolved.

- [ ] **Step 4: Implement**

`apps/web/lib/rich-text.ts`:

```ts
import sanitizeHtml from "sanitize-html";

/**
 * The tags a CMS body is allowed to contain. Deliberately narrow: anything the
 * editor cannot produce has no reason to survive into the public page.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "em", "u", "s", "blockquote",
    "ul", "ol", "li", "h2", "h3", "h4", "a", "figure", "figcaption", "img",
  ],
  allowedAttributes: {
    a: ["href", "title"],
    img: ["src", "alt", "width", "height", "loading"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noreferrer noopener" }),
  },
};

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
```

`apps/web/components/rich-text.tsx`:

```tsx
import { sanitizeRichText } from "@/lib/rich-text";

/** Renders a CMS body. Sanitised on the server, every time it is rendered. */
export function RichText({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
    />
  );
}
```

- [ ] **Step 5: Build the two pages**

`apps/web/app/[locale]/services/page.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ServicesGrid } from "@/components/sections/services-grid";
import { getServices } from "@/lib/content";

export default async function ServicesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const services = await getServices();
  const t = await getTranslations("services");

  return (
    <main id="main" className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 pb-4 pt-28">
        <h1 className="display-1">{t("title")}</h1>
        <p className="mt-6 max-w-2xl text-lg text-ink/70">{t("intro")}</p>
      </div>
      <ServicesGrid locale={locale} services={services} />
    </main>
  );
}
```

`ServicesGrid` renders its own `<Section>` header from the `home.*` catalogue, which would repeat the page title. Give it an optional `bare` prop so the page can suppress the header:

```tsx
export function ServicesGrid({
  locale, services, bare = false,
}: { locale: Locale; services: ServiceView[]; bare?: boolean }) {
```
and pass `numeral`/`eyebrow`/`title` as `undefined` when `bare` is set. The `/services` page passes `bare`.

`apps/web/app/[locale]/services/[slug]/page.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LeadForm } from "@/components/forms/lead-form";
import { Picture } from "@/components/media/picture";
import { RichText } from "@/components/rich-text";
import { getService, getServices } from "@/lib/content";
import { text } from "@/lib/locale-text";

export async function generateStaticParams() {
  const services = await getServices();
  return services.map((service) => ({ slug: service.slug }));
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const service = await getService(slug);
  if (!service) notFound();

  const services = await getServices();
  const t = await getTranslations("services");

  return (
    <main id="main" className="bg-bone">
      {service.cover ? (
        <Picture
          media={service.cover}
          locale={locale}
          sizes="100vw"
          priority
          className="h-[46svh] w-full object-cover"
        />
      ) : null}

      <div className="mx-auto max-w-7xl px-5 py-20">
        <h1 className="display-1 max-w-4xl">{text(service, "title", locale)}</h1>
        <p className="mt-6 max-w-2xl text-lg text-ink/70">{text(service, "summary", locale)}</p>

        <div className="mt-16 grid gap-16 lg:grid-cols-[2fr_1fr]">
          <RichText
            html={text(service, "body", locale)}
            className="prose-headings:heading max-w-2xl space-y-4 [&_a]:text-brand [&_a]:underline [&_li]:ml-5 [&_li]:list-disc"
          />

          <aside className="border border-ink/10 p-8">
            <h2 className="heading">{t("enquire")}</h2>
            <div className="mt-6">
              <LeadForm
                locale={locale}
                services={services}
                sourcePath={`/${locale}/services/${slug}`}
                defaultType="QUOTE"
              />
            </div>
          </aside>
        </div>

        {service.gallery.length > 0 ? (
          <section className="mt-24">
            <h2 className="heading">{t("gallery")}</h2>
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {service.gallery.map((image) => (
                <li key={image.id}>
                  <Picture
                    media={image}
                    locale={locale}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="aspect-[3/2] w-full object-cover"
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
```

The form on a service page pre-selects nothing but posts `sourcePath`, so the admin can see which page produced the lead.

- [ ] **Step 6: Verify**

```bash
pnpm --filter @homeinn/web test
pnpm --filter @homeinn/web build
```
With the API running, the build prerenders all seven service slugs in both locales — 14 pages. Check the output lists them.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): add the services index and detail pages"
```

---

## Task 15: `/projects`, the working-area filter, and `/projects/[slug]`

**Files:**
- Create: `apps/web/lib/project-filter.ts`, `apps/web/lib/project-filter.test.ts`
- Create: `apps/web/components/project-filter-bar.tsx`, `project-filter-bar.test.tsx`
- Create: `apps/web/app/[locale]/projects/page.tsx`
- Create: `apps/web/app/[locale]/projects/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getProjects(workingArea?)`, `getProject(slug)`, `getWorkingAreas` from `@/lib/content`; `ProjectCard` from Task 12.
- Produces:
  - `areaFromSearchParams(params): string | undefined`
  - `<ProjectFilterBar locale areas active />`

The public URL parameter is `?area=`; the API's is `?workingArea=`. Translating in one tested function keeps the short URL without scattering the mapping.

- [ ] **Step 1: Write the failing tests**

`apps/web/lib/project-filter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { areaFromSearchParams } from "./project-filter";

describe("areaFromSearchParams", () => {
  it("reads a single value", () => {
    expect(areaFromSearchParams({ area: "landscaping" })).toBe("landscaping");
  });

  it("takes the first when a param repeats", () => {
    expect(areaFromSearchParams({ area: ["landscaping", "gypsum-work"] })).toBe("landscaping");
  });

  it("returns undefined when absent, empty, or blank", () => {
    expect(areaFromSearchParams({})).toBeUndefined();
    expect(areaFromSearchParams({ area: "" })).toBeUndefined();
    expect(areaFromSearchParams({ area: "   " })).toBeUndefined();
  });

  it("ignores unrelated params", () => {
    expect(areaFromSearchParams({ page: "2" })).toBeUndefined();
  });
});
```

`apps/web/components/project-filter-bar.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WorkingAreaView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { ProjectFilterBar } from "./project-filter-bar";

const areas: WorkingAreaView[] = [
  { id: "w1", slug: "landscaping", nameEn: "Landscaping", nameBn: "ল্যান্ডস্কেপিং", sortOrder: 0 },
  { id: "w2", slug: "gypsum-work", nameEn: "Gypsum Work", nameBn: "জিপসাম ওয়ার্ক", sortOrder: 1 },
];

describe("ProjectFilterBar", () => {
  it("offers an all-projects option plus every area", () => {
    renderWithIntl(<ProjectFilterBar locale="en" areas={areas} active={undefined} />);
    expect(screen.getByRole("link", { name: "All projects" })).toHaveAttribute("href", "/en/projects");
    expect(screen.getByRole("link", { name: "Landscaping" }))
      .toHaveAttribute("href", "/en/projects?area=landscaping");
  });

  it("marks the active filter for assistive technology", () => {
    renderWithIntl(<ProjectFilterBar locale="en" areas={areas} active="landscaping" />);
    expect(screen.getByRole("link", { name: "Landscaping" }))
      .toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Gypsum Work" }))
      .not.toHaveAttribute("aria-current");
  });

  it("marks all-projects active when nothing is filtered", () => {
    renderWithIntl(<ProjectFilterBar locale="en" areas={areas} active={undefined} />);
    expect(screen.getByRole("link", { name: "All projects" })).toHaveAttribute("aria-current", "true");
  });

  it("names the filter group", () => {
    renderWithIntl(<ProjectFilterBar locale="en" areas={areas} active={undefined} />);
    expect(screen.getByRole("navigation", { name: "Filter by working area" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and watch them fail**

```bash
pnpm --filter @homeinn/web test -- project
```
Expected: FAIL — two unresolved modules.

- [ ] **Step 3: Implement**

`apps/web/lib/project-filter.ts`:

```ts
type SearchParams = Record<string, string | string[] | undefined>;

/**
 * The public URL says `?area=<slug>`; the API says `?workingArea=<slug>`. The
 * short form is what appears in a shared link, so the translation lives here
 * rather than in nine call sites.
 */
export function areaFromSearchParams(params: SearchParams): string | undefined {
  const raw = params.area;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
```

`apps/web/components/project-filter-bar.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { WorkingAreaView } from "@/lib/api.types";
import { text } from "@/lib/locale-text";

export function ProjectFilterBar({
  locale,
  areas,
  active,
}: {
  locale: Locale;
  areas: WorkingAreaView[];
  active: string | undefined;
}) {
  const t = useTranslations("projects");

  const item = (href: string, label: string, isActive: boolean) => (
    <li key={href}>
      <Link
        href={href}
        aria-current={isActive ? "true" : undefined}
        className={[
          "inline-block border px-4 py-2 text-sm transition-colors",
          isActive ? "border-brand text-brand" : "border-ink/15 hover:border-ink/40",
        ].join(" ")}
      >
        {label}
      </Link>
    </li>
  );

  return (
    <nav aria-label={t("filterLabel")}>
      <ul className="flex flex-wrap gap-3">
        {item("/projects", t("all"), active === undefined)}
        {areas.map((area) =>
          item(`/projects?area=${area.slug}`, text(area, "name", locale), active === area.slug),
        )}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 4: Build the pages**

`apps/web/app/[locale]/projects/page.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProjectCard } from "@/components/project-card";
import { ProjectFilterBar } from "@/components/project-filter-bar";
import { getProjects, getWorkingAreas } from "@/lib/content";
import { areaFromSearchParams } from "@/lib/project-filter";

export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const area = areaFromSearchParams(await searchParams);
  const [projects, areas] = await Promise.all([getProjects(area), getWorkingAreas()]);
  const t = await getTranslations("projects");

  return (
    <main id="main" className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 py-28">
        <h1 className="display-1">{t("title")}</h1>
        <p className="mt-6 max-w-2xl text-lg text-ink/70">{t("intro")}</p>

        <div className="mt-12">
          <ProjectFilterBar locale={locale} areas={areas} active={area} />
        </div>

        {projects.length === 0 ? (
          <p className="mt-16 max-w-xl text-ink/60">{t("empty")}</p>
        ) : (
          <ul className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectCard locale={locale} project={project} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
```

The empty state is the honest one: spec §12 keeps case-study copy unpublished until the client confirms details, so this message will be what visitors see until then.

`apps/web/app/[locale]/projects/[slug]/page.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Picture } from "@/components/media/picture";
import { RichText } from "@/components/rich-text";
import { Link } from "@/i18n/navigation";
import { getProject, getProjects } from "@/lib/content";
import { text } from "@/lib/locale-text";

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const project = await getProject(slug);
  if (!project) notFound();

  const t = await getTranslations("projects");

  const facts = [
    { label: t("location"), value: text(project, "location", locale) },
    { label: t("year"), value: project.year ? String(project.year) : null },
    { label: t("area"), value: project.areaSqft ? `${project.areaSqft} ${t("areaUnit")}` : null },
    // Spec §11: a corporate client name is ordinary commercial reference
    // material. The working area is what distinguishes a corporate project
    // from a home, and residential rows never carry a name in the first place.
    { label: t("client"), value: project.clientName },
  ].filter((fact) => fact.value);

  return (
    <main id="main" className="bg-bone">
      {project.cover ? (
        <Picture
          media={project.cover}
          locale={locale}
          sizes="100vw"
          priority
          className="h-[60svh] w-full object-cover"
        />
      ) : null}

      <div className="mx-auto max-w-7xl px-5 py-20">
        <Link
          href={`/projects?area=${project.workingArea.slug}`}
          className="eyebrow text-brand"
        >
          {text(project.workingArea, "name", locale)}
        </Link>
        <h1 className="display-1 mt-4 max-w-4xl">{text(project, "title", locale)}</h1>

        <dl className="mt-12 grid gap-8 border-y border-ink/10 py-8 sm:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="eyebrow text-ink/50">{fact.label}</dt>
              <dd className="mt-2">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <RichText
          html={text(project, "description", locale)}
          className="mt-16 max-w-2xl space-y-4 [&_li]:ml-5 [&_li]:list-disc"
        />

        {project.gallery.length > 0 ? (
          <ul className="mt-20 grid gap-6 sm:grid-cols-2">
            {project.gallery.map((image) => (
              <li key={image.id}>
                <Picture
                  media={image}
                  locale={locale}
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="aspect-[3/2] w-full object-cover"
                />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Run and verify**

```bash
pnpm --filter @homeinn/web test
pnpm --filter @homeinn/web build
pnpm typecheck
```
Expected: PASS — 8 new tests. `generateStaticParams` returns an empty list while no project is published, which is correct: the route stays dynamic and 404s.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): add the projects grid, working-area filter, and case study page"
```

---

## Task 16: `/clients` and `/about`

**Files:**
- Create: `apps/web/components/clients/corporate-table.tsx`, `corporate-table.test.tsx`
- Create: `apps/web/components/clients/residential-summary.tsx`, `residential-summary.test.tsx`
- Create: `apps/web/components/sections/copy-block.tsx`, `copy-block.test.tsx`
- Create: `apps/web/app/[locale]/clients/page.tsx`
- Create: `apps/web/app/[locale]/about/page.tsx`

**Interfaces:**
- Consumes: `getCorporateClients`, `getResidentialSummary`, `getCertifications`, `getTeam`, `getSettings`.
- Produces:
  - `<CorporateTable locale clients />`
  - `<ResidentialSummary locale summary settings />`
  - `<CopyBlock title body />` — renders nothing when `body` is blank

Spec §11 is load-bearing on this page: corporate entities are named, residential work is aggregated, and no residential name reaches the browser. The API guarantees that; the test here asserts the page does not undo it.

- [ ] **Step 1: Write the failing tests**

`apps/web/components/clients/corporate-table.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CorporateClientView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { CorporateTable } from "./corporate-table";

const rows: CorporateClientView[] = [
  { id: "c1", serial: 1, companyName: "BFIDC", address: "Dhaka", isFlagship: true, needsVerification: false },
  { id: "c2", serial: 2, companyName: "Woodora Furniture Ltd.", address: "Savar", isFlagship: true, needsVerification: false },
];

describe("CorporateTable", () => {
  it("lists company names and addresses", () => {
    renderWithIntl(<CorporateTable locale="en" clients={rows} />);
    expect(screen.getByText("BFIDC")).toBeInTheDocument();
    expect(screen.getByText("Savar")).toBeInTheDocument();
  });

  it("preserves the profile's own ordering", () => {
    renderWithIntl(<CorporateTable locale="en" clients={[rows[1]!, rows[0]!]} />);
    const cells = screen.getAllByRole("rowheader").map((cell) => cell.textContent);
    expect(cells).toEqual(["1", "2"]);
  });

  it("explains the empty state rather than showing a bare table", () => {
    // The 73 rows are blocked on the company profile PDF.
    renderWithIntl(<CorporateTable locale="en" clients={[]} />);
    expect(screen.getByText(/being prepared for publication/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
```

`apps/web/components/clients/residential-summary.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl, settingsFixture } from "@/test/render";
import { ResidentialSummary } from "./residential-summary";

const summary = { total: 57, districts: ["Dhaka", "Savar", "Sylhet"] };

describe("ResidentialSummary", () => {
  it("states the count and the districts, and nothing else", () => {
    // Spec §11: named private individuals with location data are not published.
    renderWithIntl(
      <ResidentialSummary locale="en" summary={summary} settings={settingsFixture} />);
    expect(screen.getByText(/57 completed residential projects/)).toBeInTheDocument();
    expect(screen.getByText("Sylhet")).toBeInTheDocument();
  });

  it("explains why no names appear", () => {
    renderWithIntl(
      <ResidentialSummary locale="en" summary={summary} settings={settingsFixture} />);
    expect(screen.getByText(/aggregate/i)).toBeInTheDocument();
  });

  it("falls back to the settings count when the summary is unavailable", () => {
    renderWithIntl(
      <ResidentialSummary
        locale="en"
        summary={{ total: 0, districts: [] }}
        settings={settingsFixture}
      />);
    expect(screen.getByText(/57 completed residential projects/)).toBeInTheDocument();
  });
});
```

`apps/web/components/sections/copy-block.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { CopyBlock } from "./copy-block";

describe("CopyBlock", () => {
  it("renders a heading and body when both are written", () => {
    renderWithIntl(<CopyBlock title="Vision" body="To build well." />);
    expect(screen.getByRole("heading", { name: "Vision" })).toBeInTheDocument();
    expect(screen.getByText("To build well.")).toBeInTheDocument();
  });

  it("renders nothing when the body is blank", () => {
    // Vision / Mission / Values / Strengths / Philosophy exist verbatim in the
    // company profile PDF, which is not in this repository. Spec §12 forbids
    // writing substitutes, so the block disappears until the copy lands.
    const { container } = renderWithIntl(<CopyBlock title="Vision" body="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for whitespace", () => {
    const { container } = renderWithIntl(<CopyBlock title="Vision" body="   " />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run and watch them fail**

```bash
pnpm --filter @homeinn/web test
```
Expected: FAIL — three unresolved modules.

- [ ] **Step 3: Implement**

`apps/web/components/sections/copy-block.tsx`:

```tsx
/**
 * A titled block of prose that disappears when it has nothing to say.
 *
 * Used for the five profile blocks on /about. Their source is the company
 * profile PDF and it is not in this repository, so both message catalogues
 * carry them as empty strings and every one of these blocks is currently
 * invisible. Fill the message and the block appears — no code change.
 */
export function CopyBlock({ title, body }: { title: string; body: string }) {
  if (!body.trim()) return null;

  return (
    <div className="max-w-2xl">
      <h2 className="heading">{title}</h2>
      <p className="mt-3 text-ink/70">{body}</p>
    </div>
  );
}
```

`apps/web/components/clients/corporate-table.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import type { CorporateClientView } from "@/lib/api.types";

/**
 * Spec §11: a company name and office address is ordinary commercial reference
 * material, so corporate entities are published by name. Serial is the profile's
 * own ordering and is preserved rather than re-sorted.
 */
export function CorporateTable({
  locale,
  clients,
}: {
  locale: Locale;
  clients: CorporateClientView[];
}) {
  const t = useTranslations("clients");

  if (clients.length === 0) {
    return <p className="max-w-xl text-ink/60">{t("corporateEmpty")}</p>;
  }

  const sorted = [...clients].sort((a, b) => a.serial - b.serial);
  const format = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US");

  return (
    <table className="w-full border-collapse text-left text-sm">
      <caption className="sr-only">{t("corporateTitle")}</caption>
      <tbody>
        {sorted.map((client) => (
          <tr key={client.id} className="border-b border-ink/10 align-top">
            <th scope="row" className="w-16 py-3 pr-4 font-normal text-ink/40">
              {format.format(client.serial)}
            </th>
            <td className="py-3 pr-6">{client.companyName}</td>
            <td className="py-3 text-ink/60">{client.address}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

The `rowheader` assertion in the test relies on `<th scope="row">`; `Intl.NumberFormat("en-US")` renders `1` and `2`.

`apps/web/components/clients/residential-summary.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import type { ResidentialSummaryView, SiteSettingsView } from "@/lib/api.types";

/**
 * Spec §11. The profile lists 57 named individuals with their neighbourhoods —
 * doctors, professors, a brigadier. Consent for a PDF sent to one corporate
 * prospect is not consent for a public web page, so this component receives an
 * aggregate and has no way to render a name even if one were passed to it.
 */
export function ResidentialSummary({
  locale,
  summary,
  settings,
}: {
  locale: Locale;
  summary: ResidentialSummaryView;
  settings: SiteSettingsView;
}) {
  const t = useTranslations("clients");

  // The seeded row count is the live figure; the settings count is the profile's
  // stated one. While the row tables are blocked, only the latter is truthful.
  const total = Math.max(summary.total, settings.residentialProjectCount);
  const districts = summary.districts;

  return (
    <div>
      <p className="display-2">{t("residentialCount", { count: total })}</p>
      <p className="mt-6 max-w-xl text-ink/70">{t("residentialBody")}</p>

      {districts.length > 0 ? (
        <>
          <h3 className="eyebrow mt-12 text-ink/50">{t("districtsTitle")}</h3>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {districts.map((district) => (
              <li key={district} className="text-ink/80">{district}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Build the two pages**

`apps/web/app/[locale]/clients/page.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CorporateTable } from "@/components/clients/corporate-table";
import { ResidentialSummary } from "@/components/clients/residential-summary";
import { getCorporateClients, getResidentialSummary, getSettings } from "@/lib/content";

export default async function ClientsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [clients, summary, settings] = await Promise.all([
    getCorporateClients(),
    getResidentialSummary(),
    getSettings(),
  ]);
  const t = await getTranslations("clients");

  return (
    <main id="main" className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 py-28">
        <h1 className="display-1">{t("title")}</h1>
        <p className="mt-6 max-w-2xl text-lg text-ink/70">{t("intro")}</p>

        <section className="mt-24">
          <h2 className="display-2">{t("residentialTitle")}</h2>
          <div className="mt-8">
            <ResidentialSummary locale={locale} summary={summary} settings={settings} />
          </div>
        </section>

        <section className="mt-24">
          <h2 className="display-2">{t("corporateTitle")}</h2>
          <div className="mt-8">
            <CorporateTable locale={locale} clients={clients} />
          </div>
        </section>
      </div>
    </main>
  );
}
```

`apps/web/app/[locale]/about/page.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Credentials } from "@/components/sections/credentials";
import { CopyBlock } from "@/components/sections/copy-block";
import { Picture } from "@/components/media/picture";
import { getCertifications, getSettings, getTeam } from "@/lib/content";
import { text, textOrNull } from "@/lib/locale-text";

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, certifications, team] = await Promise.all([
    getSettings(),
    getCertifications(),
    getTeam(),
  ]);
  const t = await getTranslations("about");
  const common = await getTranslations("common");

  // Spec §12: these five come from the profile PDF, which is not in the repo.
  // Each renders only once its message is written; see CopyBlock.
  const blocks = ["vision", "mission", "values", "strengths", "philosophy"] as const;

  return (
    <main id="main" className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 py-28">
        <h1 className="display-1">{t("title")}</h1>

        <section className="mt-16 max-w-2xl">
          <p className="eyebrow">{t("storyEyebrow")}</p>
          <p className="mt-4 text-lg text-ink/70">{t("storyBody")}</p>
          <p className="mt-6 text-ink/60">{common("since", { year: settings.establishedYear })}</p>
        </section>

        <div className="mt-20 grid gap-14 sm:grid-cols-2">
          {blocks.map((block) => (
            <CopyBlock key={block} title={t(`${block}Title`)} body={t(`${block}Body`)} />
          ))}
        </div>

        {team.length > 0 ? (
          <section className="mt-24">
            <h2 className="display-2">{t("teamTitle")}</h2>
            <ul className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {team.map((member) => {
                const bio = textOrNull(member, "bio", locale);
                return (
                  <li key={member.id}>
                    {member.photo ? (
                      <Picture
                        media={member.photo}
                        locale={locale}
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="aspect-square w-full object-cover"
                      />
                    ) : null}
                    <h3 className="heading mt-4">{member.name}</h3>
                    <p className="text-sm text-ink/60">{text(member, "role", locale)}</p>
                    {bio ? <p className="mt-2 text-sm text-ink/70">{bio}</p> : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      <Credentials locale={locale} certifications={certifications} />
    </main>
  );
}
```

The team section is absent today — spec §12 seeds it empty and hides it until real people are added.

- [ ] **Step 5: Run and verify**

```bash
pnpm --filter @homeinn/web test
pnpm --filter @homeinn/web build
pnpm typecheck
```
Expected: PASS — 9 new tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): add the clients track record and about pages"
```

---

## Task 17: `/blog` and `/blog/[slug]`

**Files:**
- Create: `apps/web/lib/dates.ts`, `apps/web/lib/dates.test.ts`
- Create: `apps/web/components/blog/post-card.tsx`, `post-card.test.tsx`
- Create: `apps/web/app/[locale]/blog/page.tsx`
- Create: `apps/web/app/[locale]/blog/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getBlogPosts`, `getBlogPost` from `@/lib/content`; `RichText` from Task 14.
- Produces:
  - `formatDate(iso: string | null, locale: Locale): string`
  - `<PostCard locale post />`

- [ ] **Step 1: Write the failing tests**

`apps/web/lib/dates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatDate } from "./dates";

describe("formatDate", () => {
  it("formats an ISO date in English", () => {
    expect(formatDate("2026-03-14T00:00:00.000Z", "en")).toBe("14 March 2026");
  });

  it("formats in Bangla with Bangla numerals", () => {
    const formatted = formatDate("2026-03-14T00:00:00.000Z", "bn");
    expect(formatted).toMatch(/[০-৯]/);
  });

  it("returns an empty string for a missing date rather than Invalid Date", () => {
    expect(formatDate(null, "en")).toBe("");
  });

  it("returns an empty string for an unparseable value", () => {
    expect(formatDate("not-a-date", "en")).toBe("");
  });
});
```

`apps/web/components/blog/post-card.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BlogPostView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { PostCard } from "./post-card";

const post: BlogPostView = {
  id: "b1", slug: "choosing-plywood",
  titleEn: "Choosing plywood", titleBn: "প্লাইউড বাছাই",
  excerptEn: "What to look for.", excerptBn: "কী দেখবেন।",
  bodyEn: "<p>x</p>", bodyBn: "<p>x</p>",
  tags: ["materials"], published: true,
  publishedAt: "2026-03-14T00:00:00.000Z", cover: null,
};

describe("PostCard", () => {
  it("links to the post", () => {
    renderWithIntl(<PostCard locale="en" post={post} />);
    expect(screen.getByRole("link", { name: /Choosing plywood/ }))
      .toHaveAttribute("href", "/en/blog/choosing-plywood");
  });

  it("shows the excerpt and the published date", () => {
    renderWithIntl(<PostCard locale="en" post={post} />);
    expect(screen.getByText("What to look for.")).toBeInTheDocument();
    expect(screen.getByText(/14 March 2026/)).toBeInTheDocument();
  });

  it("renders Bangla for bn", () => {
    renderWithIntl(<PostCard locale="bn" post={post} />, { locale: "bn" });
    expect(screen.getByText("প্লাইউড বাছাই")).toBeInTheDocument();
  });

  it("omits the date line for an undated post", () => {
    renderWithIntl(<PostCard locale="en" post={{ ...post, publishedAt: null }} />);
    expect(screen.queryByText(/Published/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and watch them fail**

```bash
pnpm --filter @homeinn/web test -- post-card dates
```
Expected: FAIL — two unresolved modules.

- [ ] **Step 3: Implement**

`apps/web/lib/dates.ts`:

```ts
import type { Locale } from "@homeinn/types";

const FORMATS: Record<Locale, string> = { en: "en-GB", bn: "bn-BD" };

/**
 * A published date, in the reader's locale. Returns an empty string rather than
 * "Invalid Date" for anything unparseable — a blog card should lose a line, not
 * shout about a data problem.
 */
export function formatDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(FORMATS[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
```

`apps/web/components/blog/post-card.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { Picture } from "@/components/media/picture";
import { Link } from "@/i18n/navigation";
import type { BlogPostView } from "@/lib/api.types";
import { formatDate } from "@/lib/dates";
import { text } from "@/lib/locale-text";

export function PostCard({ locale, post }: { locale: Locale; post: BlogPostView }) {
  const t = useTranslations("blog");
  const published = formatDate(post.publishedAt, locale);

  return (
    <article>
      <Link href={`/blog/${post.slug}`} className="group block">
        {post.cover ? (
          <Picture
            media={post.cover}
            locale={locale}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="aspect-[3/2] w-full object-cover"
          />
        ) : null}
        <h3 className="heading mt-4 group-hover:text-brand">{text(post, "title", locale)}</h3>
        <p className="mt-2 text-sm text-ink/70">{text(post, "excerpt", locale)}</p>
        {published ? (
          <p className="eyebrow mt-4 text-ink/40">{t("published", { date: published })}</p>
        ) : null}
      </Link>
    </article>
  );
}
```

- [ ] **Step 4: Build the pages**

`apps/web/app/[locale]/blog/page.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PostCard } from "@/components/blog/post-card";
import { getBlogPosts } from "@/lib/content";

export default async function BlogPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const posts = await getBlogPosts();
  const t = await getTranslations("blog");

  return (
    <main id="main" className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 py-28">
        <h1 className="display-1">{t("title")}</h1>
        <p className="mt-6 max-w-2xl text-lg text-ink/70">{t("intro")}</p>

        {posts.length === 0 ? (
          <p className="mt-16 text-ink/60">{t("empty")}</p>
        ) : (
          <ul className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard locale={locale} post={post} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
```

`apps/web/app/[locale]/blog/[slug]/page.tsx`:

```tsx
import type { Locale } from "@homeinn/types";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Picture } from "@/components/media/picture";
import { RichText } from "@/components/rich-text";
import { getBlogPost, getBlogPosts } from "@/lib/content";
import { formatDate } from "@/lib/dates";
import { text } from "@/lib/locale-text";

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = await getBlogPost(slug);
  if (!post) notFound();

  const t = await getTranslations("blog");
  const published = formatDate(post.publishedAt, locale);

  return (
    <main id="main" className="bg-bone">
      <article className="mx-auto max-w-3xl px-5 py-28">
        <h1 className="display-1">{text(post, "title", locale)}</h1>
        {published ? (
          <p className="eyebrow mt-6 text-ink/40">
            <time dateTime={post.publishedAt ?? undefined}>{t("published", { date: published })}</time>
          </p>
        ) : null}

        {post.cover ? (
          <Picture
            media={post.cover}
            locale={locale}
            sizes="(min-width: 768px) 768px, 100vw"
            priority
            className="mt-12 aspect-[3/2] w-full object-cover"
          />
        ) : null}

        <RichText
          html={text(post, "body", locale)}
          className="mt-12 space-y-4 text-lg [&_a]:text-brand [&_a]:underline [&_h2]:heading [&_li]:ml-5 [&_li]:list-disc"
        />

        {post.tags.length > 0 ? (
          <footer className="mt-16 border-t border-ink/10 pt-6">
            <h2 className="eyebrow text-ink/40">{t("tags")}</h2>
            <ul className="mt-3 flex flex-wrap gap-3 text-sm text-ink/60">
              {post.tags.map((tag) => <li key={tag}>{tag}</li>)}
            </ul>
          </footer>
        ) : null}
      </article>
    </main>
  );
}
```

- [ ] **Step 5: Run and verify**

```bash
pnpm --filter @homeinn/web test
pnpm typecheck
```
Expected: PASS — 8 new tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): add the blog index and post pages"
```

---

## Task 18: SEO — metadata, hreflang, JSON-LD, sitemap, robots

**Files:**
- Create: `apps/web/lib/seo.ts`, `apps/web/lib/seo.test.ts`
- Create: `apps/web/components/seo/json-ld.tsx`
- Create: `apps/web/app/sitemap.ts`, `apps/web/app/robots.ts`
- Modify: every `page.tsx` under `app/[locale]` (add `generateMetadata`)
- Modify: `apps/web/app/[locale]/layout.tsx`

**Interfaces:**
- Consumes: `siteUrl()` from `@/lib/env`; `SeoView` from `@/lib/api.types`.
- Produces:
  - `canonicalFor(locale, path): string`
  - `alternatesFor(path): { canonical, languages }`
  - `pageMetadata({ locale, path, title, description, image }): Metadata`
  - `metadataFromSeo(seo, locale, fallback): { title, description }`
  - `organizationJsonLd(settings, locale)`, `localBusinessJsonLd(settings, locale)`
  - `breadcrumbJsonLd(locale, trail)`, `articleJsonLd(post, locale)`
  - `<JsonLd data />`

Spec §11: per-page metadata from the `Seo` model with sensible derivations as the fallback. The `Seo` rows are all null today — nothing writes them until Plan 1C's admin — so the derivation path is the one that runs, and both paths are tested.

- [ ] **Step 1: Write the failing tests**

`apps/web/lib/seo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  alternatesFor, articleJsonLd, breadcrumbJsonLd, canonicalFor, localBusinessJsonLd,
  metadataFromSeo,
} from "./seo";

const settings = {
  id: "singleton", phone: "01760775454", whatsapp: "+8801760775454",
  email: "homeinnbd14@gmail.com",
  addressEn: "Plot# 18, Road# 03, Block# KHA, Section# 06, Mirpur-10, Dhaka-1216",
  addressBn: "প্লট# ১৮, মিরপুর-১০, ঢাকা-১২১৬",
  hoursEn: "Open every day", hoursBn: "প্রতিদিন খোলা",
  facebookUrl: "https://www.facebook.com/homeinnbd14",
  instagramUrl: "https://www.instagram.com/homeinnbd",
  youtubeUrl: null,
  establishedYear: 2015, corporateProjectCount: 73,
  residentialProjectCount: 57, districtCount: 13,
};

describe("canonicalFor", () => {
  it("prefixes the locale", () => {
    expect(canonicalFor("bn", "/services")).toBe("http://localhost:3000/bn/services");
  });

  it("handles the home route without a trailing slash", () => {
    expect(canonicalFor("en", "/")).toBe("http://localhost:3000/en");
  });
});

describe("alternatesFor", () => {
  it("declares both languages plus x-default", () => {
    expect(alternatesFor("en", "/services")).toEqual({
      canonical: "http://localhost:3000/en/services",
      languages: {
        en: "http://localhost:3000/en/services",
        bn: "http://localhost:3000/bn/services",
        "x-default": "http://localhost:3000/en/services",
      },
    });
  });
});

describe("metadataFromSeo", () => {
  const fallback = { title: "Services", description: "Seven services." };

  it("prefers the CMS values when they exist", () => {
    const seo = {
      titleEn: "Interior services", titleBn: "ইন্টেরিয়র সেবা",
      descriptionEn: "What we offer.", descriptionBn: "আমরা যা দিই।", ogImage: null,
    };
    expect(metadataFromSeo(seo, "bn", fallback))
      .toEqual({ title: "ইন্টেরিয়র সেবা", description: "আমরা যা দিই।" });
  });

  it("derives from the fallback when no Seo row exists", () => {
    // Nothing writes Seo rows until Plan 1C, so this is the live path.
    expect(metadataFromSeo(null, "en", fallback)).toEqual(fallback);
  });

  it("falls back field by field, not all or nothing", () => {
    const seo = {
      titleEn: "Interior services", titleBn: "ইন্টেরিয়র সেবা",
      descriptionEn: null, descriptionBn: null, ogImage: null,
    };
    expect(metadataFromSeo(seo, "en", fallback))
      .toEqual({ title: "Interior services", description: "Seven services." });
  });
});

describe("localBusinessJsonLd", () => {
  it("carries the real NAP", () => {
    const json = localBusinessJsonLd(settings, "en");
    expect(json["@type"]).toBe("LocalBusiness");
    expect(json.telephone).toBe("01760775454");
    expect(json.email).toBe("homeinnbd14@gmail.com");
    expect(json.address).toMatchObject({ addressLocality: expect.stringContaining("Dhaka") });
  });

  it("lists only the social profiles that exist", () => {
    expect(localBusinessJsonLd(settings, "en").sameAs).toEqual([
      "https://www.facebook.com/homeinnbd14",
      "https://www.instagram.com/homeinnbd",
    ]);
  });

  it("uses the Bangla address for bn", () => {
    expect(localBusinessJsonLd(settings, "bn").address.streetAddress).toContain("মিরপুর");
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers the trail from one", () => {
    const json = breadcrumbJsonLd("en", [
      { name: "Services", path: "/services" },
      { name: "Interior Design", path: "/services/interior-design" },
    ]);
    expect(json.itemListElement[0]).toMatchObject({ position: 1, name: "Services" });
    expect(json.itemListElement[1]).toMatchObject({
      position: 2, item: "http://localhost:3000/en/services/interior-design",
    });
  });
});

describe("articleJsonLd", () => {
  it("describes the post", () => {
    const json = articleJsonLd(
      { slug: "a", titleEn: "A", titleBn: "ক", excerptEn: "x", excerptBn: "ক্স",
        publishedAt: "2026-03-14T00:00:00.000Z" },
      "en",
    );
    expect(json["@type"]).toBe("Article");
    expect(json.headline).toBe("A");
    expect(json.datePublished).toBe("2026-03-14T00:00:00.000Z");
    expect(json.mainEntityOfPage).toBe("http://localhost:3000/en/blog/a");
  });

  it("omits datePublished when the post has no date", () => {
    const json = articleJsonLd(
      { slug: "a", titleEn: "A", titleBn: "ক", excerptEn: "x", excerptBn: "ক্স", publishedAt: null },
      "en",
    );
    expect(json.datePublished).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run and watch it fail**

```bash
pnpm --filter @homeinn/web test -- seo
```
Expected: FAIL — `./seo` unresolved.

- [ ] **Step 3: Implement**

`apps/web/lib/seo.ts`:

```ts
import type { Locale } from "@homeinn/types";
import type { Metadata } from "next";
import type { SeoView, SiteSettingsView } from "./api.types";
import { siteUrl } from "./env";

const LOCALES: Locale[] = ["en", "bn"];

/** `/services` → `https://site/en/services`; `/` → `https://site/en`. */
export function canonicalFor(locale: Locale, path: string): string {
  const clean = path === "/" ? "" : path;
  return `${siteUrl()}/${locale}${clean}`;
}

/** Spec §11: hreflang alternates on every page, both locales, plus x-default. */
export function alternatesFor(locale: Locale, path: string) {
  const languages = Object.fromEntries(
    LOCALES.map((candidate) => [candidate, canonicalFor(candidate, path)]),
  ) as Record<Locale, string>;

  return {
    canonical: canonicalFor(locale, path),
    languages: { ...languages, "x-default": canonicalFor("en", path) },
  };
}

interface Fallback {
  title: string;
  description: string;
}

/**
 * The `Seo` model wins where it is filled, field by field. Nothing writes it
 * until Plan 1C's admin, so today every page takes the derivation — which is
 * why the fallback has to be good rather than a placeholder.
 */
export function metadataFromSeo(
  seo: Pick<SeoView, "titleEn" | "titleBn" | "descriptionEn" | "descriptionBn"> | null,
  locale: Locale,
  fallback: Fallback,
): Fallback {
  const title = (locale === "bn" ? seo?.titleBn : seo?.titleEn) ?? "";
  const description = (locale === "bn" ? seo?.descriptionBn : seo?.descriptionEn) ?? "";

  return {
    title: title.trim() || fallback.title,
    description: description.trim() || fallback.description,
  };
}

export function pageMetadata({
  locale,
  path,
  title,
  description,
  image,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  image?: string;
}): Metadata {
  const url = canonicalFor(locale, path);

  return {
    title,
    description,
    alternates: alternatesFor(locale, path),
    openGraph: {
      title,
      description,
      url,
      siteName: "Home Inn Interior Solution",
      locale: locale === "bn" ? "bn_BD" : "en_US",
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

function socialProfiles(settings: SiteSettingsView): string[] {
  return [settings.facebookUrl, settings.instagramUrl, settings.youtubeUrl].filter(
    (url): url is string => Boolean(url),
  );
}

/** The real NAP from `SiteSettings`. Nothing here is invented (spec §12). */
export function localBusinessJsonLd(settings: SiteSettingsView, locale: Locale) {
  const address = locale === "bn" ? settings.addressBn : settings.addressEn;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Home Inn Interior Solution",
    url: canonicalFor(locale, "/"),
    telephone: settings.phone,
    email: settings.email,
    foundingDate: String(settings.establishedYear),
    address: {
      "@type": "PostalAddress",
      streetAddress: address,
      addressLocality: address,
      addressCountry: "BD",
    },
    openingHours: locale === "bn" ? settings.hoursBn : settings.hoursEn,
    sameAs: socialProfiles(settings),
  };
}

export function organizationJsonLd(settings: SiteSettingsView, locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Home Inn Interior Solution",
    url: canonicalFor(locale, "/"),
    email: settings.email,
    telephone: settings.phone,
    foundingDate: String(settings.establishedYear),
    sameAs: socialProfiles(settings),
  };
}

export function breadcrumbJsonLd(locale: Locale, trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: canonicalFor(locale, crumb.path),
    })),
  };
}

export function articleJsonLd(
  post: {
    slug: string;
    titleEn: string; titleBn: string;
    excerptEn: string; excerptBn: string;
    publishedAt: string | null;
  },
  locale: Locale,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: locale === "bn" ? post.titleBn : post.titleEn,
    description: locale === "bn" ? post.excerptBn : post.excerptEn,
    datePublished: post.publishedAt ?? undefined,
    mainEntityOfPage: canonicalFor(locale, `/blog/${post.slug}`),
    author: { "@type": "Organization", name: "Home Inn Interior Solution" },
  };
}
```

`apps/web/components/seo/json-ld.tsx`:

```tsx
/**
 * JSON-LD is data, not markup, so it goes in verbatim. `<` is escaped because
 * a literal `</script>` inside the payload would close the tag early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
```

- [ ] **Step 4: Add metadata to every page**

`apps/web/app/[locale]/layout.tsx` — the default metadata and the site-wide JSON-LD:

```tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return {
    metadataBase: new URL(siteUrl()),
    ...pageMetadata({
      locale,
      path: "/",
      title: t("defaultTitle"),
      description: t("defaultDescription"),
    }),
    title: { default: t("defaultTitle"), template: t("titleTemplate", { page: "%s" }) },
  };
}
```

and inside `<body>`, before `<SiteHeader>`:

```tsx
          <JsonLd data={localBusinessJsonLd(settings, locale)} />
          <JsonLd data={organizationJsonLd(settings, locale)} />
```

Then add a `generateMetadata` to each page. The index routes follow one shape:

```tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "services" });
  return pageMetadata({ locale, path: "/services", title: t("title"), description: t("intro") });
}
```

Repeat with the matching namespace and path for `/about`, `/projects`, `/clients`, `/blog` and `/contact`.

Detail routes read the `Seo` row first:

```tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const service = await getService(slug);
  if (!service) return {};

  const { title, description } = metadataFromSeo(service.seo, locale, {
    title: text(service, "title", locale),
    description: text(service, "summary", locale),
  });

  return pageMetadata({
    locale,
    path: `/services/${slug}`,
    title,
    description,
    image: service.seo?.ogImage
      ? largestSrc(service.seo.ogImage.sources[1]?.srcset ?? "")
      : service.cover
        ? largestSrc(service.cover.sources[1]?.srcset ?? "")
        : undefined,
  });
}
```

Apply the same to `/projects/[slug]` (fallback: title + location) and `/blog/[slug]` (fallback: title + excerpt). Add `<JsonLd data={breadcrumbJsonLd(...)} />` to each detail page's body, and `<JsonLd data={articleJsonLd(post, locale)} />` to the blog post.

- [ ] **Step 5: Generate the sitemap and robots**

`apps/web/app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getBlogPosts, getProjects, getServices } from "@/lib/content";
import { canonicalFor } from "@/lib/seo";

const STATIC_PATHS = ["/", "/about", "/services", "/projects", "/clients", "/blog", "/contact"];

/** Spec §11: generated from published content, both locales. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, projects, posts] = await Promise.all([
    getServices(),
    getProjects(),
    getBlogPosts(),
  ]);

  const paths = [
    ...STATIC_PATHS,
    ...services.map((service) => `/services/${service.slug}`),
    ...projects.map((project) => `/projects/${project.slug}`),
    ...posts.map((post) => `/blog/${post.slug}`),
  ];

  return paths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: canonicalFor(locale, path),
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((alt) => [alt, canonicalFor(alt, path)]),
        ),
      },
    })),
  );
}
```

`apps/web/app/robots.ts`:

```ts
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/en/admin", "/bn/admin"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
```

`/admin` does not exist until Plan 1C; disallowing it now means the CMS is never indexed even for the window between its first deploy and someone remembering to update this file.

- [ ] **Step 6: Verify**

```bash
pnpm --filter @homeinn/web test -- seo
pnpm --filter @homeinn/web build
pnpm --filter @homeinn/web dev
```
```bash
curl -s localhost:3000/sitemap.xml | head -20
curl -s localhost:3000/robots.txt
curl -s localhost:3000/bn/services | grep -o 'hreflang="[a-z-]*"'
curl -s localhost:3000/en | grep -o '"@type":"LocalBusiness"'
```
Expected: a sitemap listing both locales, robots with the sitemap line, `hreflang` for `en`, `bn` and `x-default`, and the LocalBusiness block.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): add per-page metadata, json-ld, sitemap, and robots"
```

---

## Task 19: Error boundaries, end-to-end tests, accessibility, and hero visual regression

**Files:**
- Create: `apps/web/app/[locale]/not-found.tsx`, `apps/web/app/[locale]/error.tsx`, `apps/web/app/not-found.tsx`
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/lead.spec.ts`, `apps/web/e2e/locale.spec.ts`, `apps/web/e2e/hero.spec.ts`, `apps/web/e2e/accessibility.spec.ts`, `apps/web/e2e/errors.spec.ts`
- Modify: `apps/web/package.json`
- Modify: `handout.md`

**Interfaces:**
- Consumes: the whole app.
- Produces: `pnpm --filter @homeinn/web test:e2e`.

Spec §13 names the flows worth covering: submit a lead in both locales · locale switch preserves the current route · reduced-motion renders the stacked hero · 404 and error boundaries · axe on every top-level route in both locales · hero screenshots at five scroll positions.

Admin login/edit/publish is on that list too. It belongs to Plan 1C, which builds the admin — noted here so it is not lost.

- [ ] **Step 1: Install Playwright**

```bash
pnpm --filter @homeinn/web add -D @playwright/test @axe-core/playwright
pnpm --filter @homeinn/web exec playwright install chromium
```

- [ ] **Step 2: Write the error boundaries**

`apps/web/app/[locale]/not-found.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("errors");
  const common = useTranslations("common");

  return (
    <main id="main" className="bg-ink text-sand">
      <div className="mx-auto flex min-h-[70svh] max-w-3xl flex-col justify-center px-5">
        <p className="section-numeral">404</p>
        <h1 className="display-1 mt-4">{t("notFoundTitle")}</h1>
        <p className="mt-6 text-sand-dim">{t("notFoundBody")}</p>
        <Link href="/" className="mt-10 text-brand underline-offset-4 hover:underline">
          {common("backHome")}
        </Link>
      </div>
    </main>
  );
}
```

`apps/web/app/[locale]/error.tsx`:

```tsx
"use client";

import { Button } from "@homeinn/ui";
import { useTranslations } from "next-intl";

export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("errors");

  return (
    <main id="main" className="bg-ink text-sand">
      <div className="mx-auto flex min-h-[70svh] max-w-3xl flex-col justify-center px-5">
        <h1 className="display-1">{t("errorTitle")}</h1>
        <p className="mt-6 text-sand-dim">{t("errorBody")}</p>
        <div className="mt-10">
          <Button onClick={reset}>{t("retry")}</Button>
        </div>
      </div>
    </main>
  );
}
```

`apps/web/app/not-found.tsx` — for a URL with no locale segment at all, where no messages are loaded:

```tsx
export default function RootNotFound() {
  return (
    <html lang="en">
      <body style={{ background: "#0B0B0C", color: "#E7DFD2", fontFamily: "system-ui" }}>
        <main style={{ padding: "4rem 1.5rem" }}>
          <h1>404</h1>
          <p>
            <a href="/en" style={{ color: "#E01B24" }}>Home Inn Interior Solution</a>
          </p>
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Configure Playwright**

`apps/web/playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

const WEB = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: WEB, trace: "on-first-retry" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  // The API must already be running against a seeded database:
  //   pnpm db:start && pnpm --filter @homeinn/api seed
  //   pnpm --filter @homeinn/api dev
  webServer: {
    command: "pnpm --filter @homeinn/web dev",
    url: WEB,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 4: Write the specs**

`apps/web/e2e/locale.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("the bare origin redirects into a locale", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(en|bn)$/);
});

test("switching language keeps the visitor on the same route", async ({ page }) => {
  await page.goto("/en/services");
  await page.getByRole("link", { name: "বাংলা" }).first().click();
  await expect(page).toHaveURL("/bn/services");
});

test("a bn page declares its language and never falls back to English chrome", async ({ page }) => {
  await page.goto("/bn");
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await expect(page.getByRole("link", { name: "প্রকল্প" }).first()).toBeVisible();
});

test("every page declares hreflang alternates", async ({ page }) => {
  await page.goto("/en/contact");
  await expect(page.locator('link[hreflang="bn"]')).toHaveAttribute(
    "href", /\/bn\/contact$/,
  );
});
```

`apps/web/e2e/lead.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

/** A different number per run keeps repeat runs from looking like one visitor. */
function phone(): string {
  return `01${Math.floor(700000000 + Math.random() * 99999999)}`.slice(0, 11);
}

for (const locale of ["en", "bn"] as const) {
  test(`a visitor can submit an enquiry in ${locale}`, async ({ page }) => {
    await page.goto(`/${locale}/contact`);

    await page.getByLabel(locale === "bn" ? /আপনার নাম/ : /Your name/).fill("Playwright");
    await page.getByLabel(locale === "bn" ? /মোবাইল নম্বর/ : /Mobile number/).fill(phone());
    await page.getByRole("button", { name: locale === "bn" ? "পাঠান" : "Send enquiry" }).click();

    await expect(page.getByRole("status")).toContainText(locale === "bn" ? /ধন্যবাদ/ : /Thank you/);
  });
}

test("a malformed phone number is caught in the browser", async ({ page }) => {
  await page.goto("/en/contact");

  await page.getByLabel(/Your name/).fill("Playwright");
  await page.getByLabel(/Mobile number/).fill("12345");
  await page.getByRole("button", { name: "Send enquiry" }).click();

  await expect(page.getByRole("status")).toContainText(/valid Bangladeshi mobile number/);
});
```

`apps/web/e2e/hero.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.describe("the scroll panorama", () => {
  test("renders a stacked layout under prefers-reduced-motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/en");

    // Spec §7: no pin, no transform — the same content on ordinary scroll.
    await expect(page.locator("[data-hero-strip]")).toHaveCount(0);
    await context.close();
  });

  test("pans without a visible seam at five scroll positions", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the strip only pans on desktop");
    await page.goto("/en");

    const section = page.locator("section").first();
    const height = await section.evaluate((el) => el.getBoundingClientRect().height);
    const viewport = page.viewportSize()?.height ?? 900;
    const travel = Math.max(0, height - viewport);

    for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), travel * fraction);
      await page.waitForTimeout(400);
      await expect(page).toHaveScreenshot(`hero-${fraction}.png`, { maxDiffPixelRatio: 0.02 });
    }
  });

  test("offers a way past the pinned section", async ({ page }) => {
    await page.goto("/en");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: /Skip/ }).first()).toBeVisible();
  });
});
```

The screenshot test is a regression net, not a design gate: the first run writes the baselines, and a seam appearing later fails CI. With no hero segments seeded, the baselines capture the text-only hero, which is still a real regression net for the layout. Re-baseline after `pnpm seed:hero` with real images: `pnpm --filter @homeinn/web test:e2e -- --update-snapshots`.

`apps/web/e2e/accessibility.spec.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ROUTES = ["/", "/about", "/services", "/projects", "/clients", "/blog", "/contact"];

for (const locale of ["en", "bn"] as const) {
  for (const route of ROUTES) {
    test(`${locale}${route} has no detectable accessibility violations`, async ({ page }) => {
      await page.goto(`/${locale}${route === "/" ? "" : route}`);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
}
```

`apps/web/e2e/errors.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("an unknown route renders the localised 404", async ({ page }) => {
  const response = await page.goto("/en/not-a-real-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /does not exist/ })).toBeVisible();
});

test("an unknown service slug 404s rather than erroring", async ({ page }) => {
  const response = await page.goto("/bn/services/not-a-real-service");
  expect(response?.status()).toBe(404);
});

test("an unpublished draft is not reachable by guessing its slug", async ({ page }) => {
  // The public API filters on published; this asserts the web app does not
  // route around it.
  const response = await page.goto("/en/projects/definitely-not-published");
  expect(response?.status()).toBe(404);
});
```

- [ ] **Step 5: Run the suite**

```bash
pnpm db:start
pnpm --filter @homeinn/api seed
pnpm --filter @homeinn/api dev          # shell 1, leave running
pnpm --filter @homeinn/web test:e2e     # shell 2
```
Expected: green. Fix whatever fails — an axe violation here is a real defect, not a test to relax. Common first failures and the right fix:
- **Colour contrast on `sand-dim` over `ink`** — raise the text colour to `sand`, do not change the palette.
- **`aria-current` on the filter bar** — already handled; if axe complains about the value, it must be `"true"` or `"page"`.
- **Landmark uniqueness** — exactly one `<main id="main">` per page.

- [ ] **Step 6: Full green run across the monorepo**

```bash
pnpm db:start
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @homeinn/api exec prisma migrate deploy
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @homeinn/api seed
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @homeinn/api test:e2e
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```
Expected: every command exits 0.

- [ ] **Step 7: Update the handout**

Append a Phase 1B section to `handout.md` in the established format: files touched, decisions worth knowing, what the tests caught, verification commands and their output, and anything deliberately skipped.

- [ ] **Step 8: Commit**

```bash
git add apps/web handout.md
git commit -m "test(web): add e2e, accessibility, and hero visual coverage"
```

---

## Self-Review

**Spec coverage.**

| Spec section | Covered by |
|---|---|
| §4 architecture — `apps/web`, `packages/ui`, Zod contract | Tasks 3, 6, 7, 13 |
| §6 IA — every route | `/` Tasks 10–13 · `/about` 16 · `/services` 14 · `/projects` 15 · `/clients` 16 · `/blog` 17 · `/contact` 13 |
| §6 home sections 1–11, in order | 1 hero (10) · 2 statement (11) · 3 services (11) · 4 areas (11) · 5 projects (12) · 6 track record (12) · 7 process (12, hidden) · 8 testimonials (12, hidden) · 9 credentials (12) · 10 CTA (13) · 11 footer (8) |
| §6 global nav + language toggle + WhatsApp | Task 8 |
| §7 hero mechanics, seams, light pool, labels | Tasks 9, 10 |
| §7 responsive/degraded matrix | Task 10 — desktop pan, `target="mobile"` subset, reduced-motion stack, and the server-rendered strip at `translateX(0)` as the no-JS hero |
| §7 performance budget | `<picture>` over `next/image`, `priority` on segment one only, lazy elsewhere, `will-change` only on the animated strip, and the three dropped animation libraries |
| §7 accessibility | Task 10 — DOM text labels, `aria-label`, skip link, first-class reduced-motion path |
| §8 palette, alternating grounds, typography, motion | Tasks 4, 6, 11 |
| §9 i18n routing, catalogues, per-locale type scale, `lang`/`hreflang` | Tasks 4, 5, 18 |
| §11 SEO metadata, JSON-LD, sitemap, robots, OG | Task 18 |
| §11 residential privacy | Task 16 — aggregate component that cannot render a name; asserted again in `public-api.e2e-spec.ts` |
| §12 honest content | Tasks 5, 12, 16 — six empty message keys, five sections that hide, `CopyBlock`, `Process`, `Testimonials`, empty-state copy on `/projects` and `/clients` |
| §13 web testing — unit, e2e, axe, visual | Tasks 9 and every component task; Task 19 |
| §15 asset checklist | Task 10 — `ASSET-CHECKLIST.md` and the `seed:hero` pipeline |

**Not covered, by design:** §10 admin CMS and the admin half of §13's e2e list belong to Plan 1C. §14 deployment is unchanged by this plan. The `/admin` route is disallowed in `robots.ts` ahead of time so it is never indexed.

**Gaps this plan closes in Plan 1A rather than in the web app:** the public read surface returned image ids with no URLs, alt text, or dimensions, and `Media.blurhash` was never written despite being spec'd as the hero's LCP placeholder. Tasks 1 and 2 fix both. Without them no image could render anywhere on the site.

**Still blocked on the company profile PDF**, and tracked so it is not lost:
- 73 corporate + 57 residential client rows (Plan 1A Task 14, three `it.todo`s in `seed.e2e-spec.ts`)
- Vision / Mission / Values / Strengths / Philosophy — six empty keys in both catalogues, five `CopyBlock`s that stay invisible
- The six key strengths behind "How we work" — `home.processTitle`
- Service descriptive copy — currently restates each title and claims nothing more
- Every image slot in `ASSET-CHECKLIST.md`

Each of these degrades to a hidden section or an honest empty state, never to invented content. The site is shippable without any of them and gets richer as each lands.

**Placeholder scan.** No TBD, no "add error handling", no "similar to Task N". Task 2 says "apply the identical shape to" five services and then names, per service, the exact include object and the exact fields to map — the pattern above it is written out in full. Task 18 says "repeat with the matching namespace" for six index routes after giving the complete function; the substitution is one namespace string and one path.

**Type consistency.**
- `PublicMedia` is defined once in `packages/types/src/media.ts` (Task 1), returned by `MediaService.toPublic` / `view` / `viewMany` (Task 1), consumed as `MediaView` in `apps/web/lib/api.types.ts` (Task 7) with `createdAt` widened to `string` because JSON has no Date.
- `text(row, field, locale)` has the same signature everywhere it is used: Tasks 8, 11, 12, 14, 15, 16, 17.
- `Locale` comes from `@homeinn/types` in every file that names it; it is never re-declared as `"en" | "bn"` in application code.
- The hero maths exports named in Task 9's interface block — `stripTranslateX`, `foregroundTranslateX`, `labelOpacity`, `lightPoolX`, `scrollDistanceVh`, `pinProgress`, `objectPosition` — are the exact names imported in Task 10.
- `usePrefersReducedMotion()` is defined once (Task 10) and is the only motion gate, used by `useReveal` (Task 11), `SmoothScroll` (Task 10) and `PanoramaHero` (Task 10).
- `Section` takes `{ numeral, eyebrow, title, tone, id, children }` in Task 11 and is called with that shape in Tasks 11, 12 and 13.
- `submitLead` returns `LeadResult` (Task 13) and `LeadForm`'s `Status` union covers exactly its three failure reasons plus `idle`, `submitting`, `success`.
- `canonicalFor(locale, path)` is called with that argument order in `alternatesFor`, `pageMetadata`, the JSON-LD builders and `sitemap.ts`.

**One thing worth watching during execution.** Task 6 runs the shadcn CLI, which sometimes appends its own colour variables to `apps/web/app/globals.css`. Task 4's `theme.test.ts` will fail loudly if it overwrites the nine `--color-*` tokens — that failure is the guard working, and the fix is to restore the §8 values, never to relax the test.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-05-phase1b-public-web-app.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
