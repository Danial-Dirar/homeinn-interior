# Architecture Remodel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present Home Inn as an architecture-to-interiors firm, and show its
own villa designs, design process and floor plans on the site.

**Architecture:**

- **Copy.** Positioning copy changes in both message catalogues.
- **Data.** A new service and working area go into the seed data. A
  manifest-driven seed imports two villa design projects from gitignored local
  renders.
- **Web.** Two new web pieces: a `Blueprint` component (a floor plan used as a
  CSS mask, which draws itself in on reveal) and a rebuilt `Process` section
  (Plan → Model → Render). Blueprints also appear behind the Statement and on
  the Architectural Design service page.

**Tech Stack:** Next.js 15 / React 19 / Tailwind v4 / next-intl / Vitest ·
NestJS 11 / Prisma 6 / Zod 3 / Jest · ImageMagick + poppler (`pdftoppm`) for
the one-off asset steps.

**Spec:** `docs/superpowers/specs/2026-10-12-architecture-remodel-design.md`

## Global Constraints

- **A render is never presented as a photograph.** Every render's alt text
  starts `3D render: ` (en) and `৩ডি রেন্ডার: ` (bn). Each project description
  contains "3D render" (en) and "৩ডি রেন্ডার" (bn).
- **Copy states no count that can go stale.** `home.areasTitle`,
  `home.servicesTitle` and `services.intro` contain no digit and no number
  word.
- **Bilingual, always.** Every new message key exists in both catalogues, and
  a Bangla value is never the English one copied.
- **Do not publish `16.09/Reference/`, `16.09/output_0*` or
  `16.09/80eeb4_…~mv2.jpeg`.** The first is other people's villas; the others
  are AI output and a downloaded file.
- **The PromeAI watermark is cropped out, never painted over.**
- **WCAG 2.1 AA in both themes.** Blueprint lines are decorative or
  `role="img"` with a label, so the text-contrast rules do not apply to them,
  but every caption must pass.
- **Reduced motion:** blueprints render complete and static, with no
  transition.
- **Commits carry no `Co-Authored-By` trailer.** Push with
  `git push git@github.com:Danial-Dirar/homeinn-interior.git main:main` (the
  HTTPS origin has no credentials).
- **Log every task in `handout.md`** at the repo root, as it lands.
- `pnpm` lives at `~/.npm-global/bin/pnpm`, so put it on `PATH`. Seeds read
  the root `.env`, so run `set -a; . ../../.env; set +a` from `apps/api`
  first.

## Review Focus

1. **A visitor with reduced motion** must get the plan fully drawn, with no
   wipe and no pen bar. Tested in Task 4.
2. **A visitor who switches theme** must get blueprint lines that follow the
   ground (charcoal on cream, cream on charcoal), never a fixed colour that
   vanishes on one of them. Tested in Task 4 (`bg-current`) and checked by eye
   in Task 7.
3. **An operator running `seed:architecture` before copying the renders** must
   get an error naming the missing files, not a half-created project. Tested
   in Task 3 (`missingRenders`).
4. **A Bangla reader** must get Bangla captions and Bangla alt text in the
   process section. Tested in Task 5.
5. **An empty project-facts row** (no location, year, area or client, which is
   true of both villas) must not render an empty bordered box. Fixed in Task
   6, checked by eye in Task 7.

---

### Task 1: Positioning copy

**Files:**
- Modify: `apps/web/messages/en.json`, `apps/web/messages/bn.json`
- Test: `apps/web/messages/messages.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the new copy. No key is added or removed in this task.

- [ ] **Step 1: Write the failing test** — append inside `describe("message catalogues", …)` in `apps/web/messages/messages.test.ts`:

```ts
  it("states no count that can go stale in titles that list things", () => {
    // "Nine kinds" went stale the day a tenth working area was added, and
    // "Six ways" the day a seventh service was. These lines describe the list
    // without counting it.
    const keys = ["home.areasTitle", "home.servicesTitle", "services.intro"];
    const english = /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i;
    const bangla = /[০-৯]|(?:^|\s)(এক|দুই|তিন|চার|পাঁচ|ছয়|সাত|আট|নয়|দশ|এগারো|বারো)(?:টি)?(?=\s|$|[,।—])/;
    const counted = keys.filter((key) => english.test(flatEn[key] ?? "") || bangla.test(flatBn[key] ?? ""));
    expect(counted).toEqual([]);
  });

  it("introduces the company as architecture as well as interiors", () => {
    expect(flatEn["home.statementTitle"]).toMatch(/^Architecture/);
    expect(flatBn["home.statementTitle"]).toMatch(/^স্থাপত্য/);
    expect(flatEn["seo.defaultTitle"]).toMatch(/Architecture/);
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/web && pnpm vitest run messages/messages.test.ts`
Expected: FAIL — the counted keys are `["home.areasTitle", "home.servicesTitle", "services.intro"]`, and statementTitle does not start with "Architecture".

- [ ] **Step 3: Rewrite the copy.** In `apps/web/messages/en.json` set these values:

```json
"heroFallbackTitle": "Architecture and interiors, built to be lived in",
"statementTitle": "Architecture, interiors and custom furniture — designed and built across Bangladesh.",
"statementBody": "Home Inn designs buildings and the spaces inside them. Since 2015 it has built and fitted out corporate offices, banks, resorts, showrooms and homes, working under the trade license of M/S Ahasan Enterprise.",
"servicesTitle": "How we take a space from the first drawing to handover.",
"areasTitle": "Every kind of project, one standard of finish.",
```

and, under `about`, `services` and `seo`:

```json
"storyBody": "Home Inn has operated in Bangladesh since 2015, under the trade license of M/S Ahasan Enterprise, delivering architectural design, interior design, custom furniture and full project implementation for corporate and residential clients.",
"intro": "From the first drawing to the finished room, offered end to end.",
"defaultTitle": "Home Inn — Architecture, interiors and custom furniture in Bangladesh",
"defaultDescription": "Architectural design, interiors, custom furniture and project implementation across Bangladesh since 2015. 73 corporate projects delivered.",
```

In `apps/web/messages/bn.json`, set the same keys:

```json
"heroFallbackTitle": "বসবাসের জন্য তৈরি স্থাপত্য ও ইন্টেরিয়র",
"statementTitle": "স্থাপত্য, ইন্টেরিয়র ও কাস্টম ফার্নিচার — সারা বাংলাদেশে নকশা ও নির্মাণ।",
"statementBody": "হোম ইন ভবন এবং ভবনের ভেতরের জায়গার নকশা করে। ২০১৫ সাল থেকে কর্পোরেট অফিস, ব্যাংক, রিসোর্ট, শোরুম ও বাসাবাড়ির নির্মাণ ও সাজসজ্জার কাজ করে আসছে — M/S Ahasan Enterprise-এর ট্রেড লাইসেন্সের অধীনে।",
"servicesTitle": "প্রথম নকশা থেকে হস্তান্তর পর্যন্ত, প্রতিটি ধাপ।",
"areasTitle": "সব ধরনের প্রকল্প, একই মানের ফিনিশিং।",
"storyBody": "২০১৫ সাল থেকে হোম ইন বাংলাদেশে কাজ করছে — M/S Ahasan Enterprise-এর ট্রেড লাইসেন্সের অধীনে কর্পোরেট ও আবাসিক ক্লায়েন্টদের জন্য স্থাপত্য নকশা, ইন্টেরিয়র ডিজাইন, কাস্টম ফার্নিচার ও সম্পূর্ণ প্রকল্প বাস্তবায়ন করছে।",
"intro": "প্রথম নকশা থেকে সম্পূর্ণ ঘর পর্যন্ত, শুরু থেকে শেষ।",
"defaultTitle": "হোম ইন — বাংলাদেশে স্থাপত্য, ইন্টেরিয়র ও কাস্টম ফার্নিচার",
"defaultDescription": "২০১৫ সাল থেকে সারা বাংলাদেশে স্থাপত্য নকশা, ইন্টেরিয়র, কাস্টম ফার্নিচার ও প্রকল্প বাস্তবায়ন। ৭৩টি কর্পোরেট প্রকল্প সম্পন্ন।",
```

- [ ] **Step 4: Run the web suite**

Run: `cd apps/web && pnpm vitest run`
Expected: PASS. If a component test asserted the old fallback title ("Interiors built to be lived in" in `panorama-hero.test.tsx`), update that one string to "Architecture and interiors, built to be lived in" — the test is pinning copy, not behaviour.

- [ ] **Step 5: Commit**

```bash
git add apps/web/messages apps/web/components/hero/panorama-hero.test.tsx
git commit -m "feat(web): introduce Home Inn as architecture and interiors"
```

---

### Task 2: Architectural Design service and working area

**Files:**
- Modify: `apps/api/prisma/seed-data/services.ts`, `apps/api/prisma/seed-data/working-areas.ts`
- Modify: `apps/web/lib/icons.ts`, `apps/web/lib/icons.test.ts`
- Test: `apps/api/test/seed.e2e-spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a service and a working area, both with slug `architectural-design` and `sortOrder: 0` (Task 3 attaches projects and the service cover by that slug), and the icon name `drafting-compass`.

- [ ] **Step 1: Write the failing tests.** In `apps/api/test/seed.e2e-spec.ts`, replace the service and working-area count tests with:

```ts
  // The profile lists 7; its 2D and 3D entries were merged (2026-08-10) and
  // Architectural Design was added (2026-10-12).
  it("creates 7 services: the profile's 7 with 2D and 3D merged, plus architectural design", async () => {
    expect(await prisma.service.count()).toBe(7);
  });

  // The profile's 9, plus factory-works (2026-08-09) and architectural-design (2026-10-12).
  it("creates 11 working areas", async () => {
    expect(await prisma.workingArea.count()).toBe(11);
  });

  it("puts architectural design first in both lists", async () => {
    const [service] = await prisma.service.findMany({ orderBy: { sortOrder: "asc" }, take: 1 });
    const [area] = await prisma.workingArea.findMany({ orderBy: { sortOrder: "asc" }, take: 1 });
    expect(service?.slug).toBe("architectural-design");
    expect(area?.slug).toBe("architectural-design");
  });
```

Change the published-services assertion from `toBe(6)` to `toBe(7)`. In `apps/web/lib/icons.test.ts`, add `"drafting-compass"` to the array in the first test.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm db:start` (ignore "already running"), then `cd apps/api && pnpm test:e2e -- seed`
Expected: FAIL — 6 ≠ 7, 10 ≠ 11, first slug is not `architectural-design`.
Run: `cd apps/web && pnpm vitest run lib/icons.test.ts`
Expected: FAIL — `drafting-compass` resolves to the fallback `Sparkles`.

- [ ] **Step 3: Add the service.** In `apps/api/prisma/seed-data/services.ts`:

- Insert this first in the array:

```ts
  // Added 2026-10-12 at Muhammad's instruction: Home Inn now "does everything
  // starting from architecture design". Not from the 2026 profile. The copy
  // claims only what the company's own drawings and renders show.
  {
    slug: "architectural-design",
    titleEn: "Architectural Design",
    titleBn: "স্থাপত্য নকশা",
    summaryEn: "Buildings designed from the plot up: measured floor plans and 3D views before anything is built.",
    summaryBn: "জমি থেকে শুরু করে ভবনের নকশা: নির্মাণের আগেই মাপসহ ফ্লোর প্ল্যান ও ৩ডি ভিউ।",
    bodyEn: "<p>Home Inn designs buildings as well as the spaces inside them. A design is worked out in measured floor plans, then modelled and rendered in 3D, so the house can be seen and changed before construction starts.</p>",
    bodyBn: "<p>হোম ইন ভবনের ভেতরের জায়গার পাশাপাশি ভবনেরও নকশা করে। মাপসহ ফ্লোর প্ল্যানে নকশা তৈরি হয়, তারপর ৩ডি-তে মডেল ও রেন্ডার করা হয়, যাতে নির্মাণ শুরুর আগেই বাড়িটি দেখা ও বদলানো যায়।</p>",
    icon: "drafting-compass",
    sortOrder: 0,
    published: true,
  },
```

- Add 1 to every other entry's `sortOrder` (they become 1–6).
- In the header comment, replace "Six rows, not the profile's seven" with "Seven rows: the profile's seven with its 2D and 3D entries merged, plus Architectural Design".

- [ ] **Step 4: Add the working area.** In `apps/api/prisma/seed-data/working-areas.ts`:

- Insert this first:

```ts
  // Added 2026-10-12: projects at the design stage, shown in 3D renders. Kept
  // apart from built work so a render is never filed beside a photograph of
  // a finished job.
  {
    slug: "architectural-design",
    nameEn: "Architectural Design",
    nameBn: "স্থাপত্য নকশা",
    sortOrder: 0,
  },
```

- Add 1 to every other entry's `sortOrder` (they become 1–10).

- [ ] **Step 5: Map the icon.** In `apps/web/lib/icons.ts`:

- Add `DraftingCompass` to the `lucide-react` import.
- Add `"drafting-compass": DraftingCompass,` to `ICONS`.
- Change "the eight icons" in the comment to "the icons".

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd apps/api && pnpm test:e2e` → all suites pass (90 tests, 3 todo, plus the new one).
Run: `cd apps/web && pnpm vitest run lib/icons.test.ts` → PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma/seed-data/services.ts apps/api/prisma/seed-data/working-areas.ts apps/api/test/seed.e2e-spec.ts apps/web/lib/icons.ts apps/web/lib/icons.test.ts
git commit -m "feat: add architectural design as the first service and working area"
```

---

### Task 3: The two villa projects

**Files:**
- Create: `apps/api/src/content/architecture-manifest.ts`, `apps/api/src/content/architecture-manifest.spec.ts`
- Create: `apps/api/prisma/seed-data/architecture.ts`, `apps/api/prisma/seed-architecture.ts`
- Modify: `apps/api/package.json` (script), `.gitignore`

**Interfaces:**
- Consumes: the working area and service with slug `architectural-design` (Task 2).
- Produces:
  - `architectureManifestSchema: z.ZodType<ArchitectureProject[]>`
  - `missingRenders(manifest: ArchitectureProject[], exists: (path: string) => boolean): string[]` — returns `"<slug>/<file>"` for each absent file
  - `ArchitectureProject = { slug; titleEn; titleBn; descriptionEn; descriptionBn; sortOrder; cover: RenderImage; gallery: RenderImage[] }`
  - `RenderImage = { file; altEn; altBn }`
  - two published, featured projects with the slugs `brick-screen-villa` and `rooftop-pool-villa`

- [ ] **Step 1: Write the failing spec** — `apps/api/src/content/architecture-manifest.spec.ts`:

```ts
import { architectureManifest } from "../../prisma/seed-data/architecture";
import { architectureManifestSchema, missingRenders, type ArchitectureProject } from "./architecture-manifest";

function project(over: Partial<ArchitectureProject> = {}): ArchitectureProject {
  return {
    slug: "test-villa",
    titleEn: "Test Villa",
    titleBn: "পরীক্ষার ভিলা",
    descriptionEn: "<p>A house, shown here in 3D renders.</p>",
    descriptionBn: "<p>একটি বাড়ি, এখানে ৩ডি রেন্ডারে দেখানো হয়েছে।</p>",
    sortOrder: 0,
    cover: { file: "front.jpg", altEn: "3D render: the front", altBn: "৩ডি রেন্ডার: সামনের দিক" },
    gallery: [{ file: "side.jpg", altEn: "3D render: the side", altBn: "৩ডি রেন্ডার: পাশের দিক" }],
    ...over,
  };
}

describe("architectureManifestSchema", () => {
  it("accepts a well-formed project", () => {
    expect(architectureManifestSchema.safeParse([project()]).success).toBe(true);
  });

  it("rejects alt text that does not say it is a render", () => {
    // A render must never read as a photograph of a built house.
    const bad = project({ cover: { file: "front.jpg", altEn: "The front of a house", altBn: "৩ডি রেন্ডার: সামনের দিক" } });
    expect(architectureManifestSchema.safeParse([bad]).success).toBe(false);
  });

  it("rejects Bangla alt text without the Bangla render prefix", () => {
    const bad = project({ cover: { file: "front.jpg", altEn: "3D render: the front", altBn: "সামনের দিক" } });
    expect(architectureManifestSchema.safeParse([bad]).success).toBe(false);
  });

  it("rejects a description that does not say these are renders", () => {
    expect(architectureManifestSchema.safeParse([project({ descriptionEn: "<p>A house.</p>" })]).success).toBe(false);
    expect(architectureManifestSchema.safeParse([project({ descriptionBn: "<p>একটি বাড়ি।</p>" })]).success).toBe(false);
  });

  it("rejects a Bangla title that is the English one copied", () => {
    expect(architectureManifestSchema.safeParse([project({ titleBn: "Test Villa" })]).success).toBe(false);
  });

  it("rejects two projects with one slug", () => {
    expect(architectureManifestSchema.safeParse([project(), project()]).success).toBe(false);
  });
});

describe("missingRenders", () => {
  it("names every file that is not on disk, so the seed can refuse before writing", () => {
    const missing = missingRenders([project()], (path) => path.endsWith("front.jpg"));
    expect(missing).toEqual(["test-villa/side.jpg"]);
  });
});

describe("the shipped architecture manifest", () => {
  it("is valid", () => {
    expect(architectureManifestSchema.safeParse(architectureManifest).success).toBe(true);
  });

  it("holds the two villas", () => {
    expect(architectureManifest.map((p) => p.slug)).toEqual(["brick-screen-villa", "rooftop-pool-villa"]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/api && pnpm jest src/content/architecture-manifest.spec.ts`
Expected: FAIL — `Cannot find module './architecture-manifest'`.

- [ ] **Step 3: Write the schema** — `apps/api/src/content/architecture-manifest.ts`:

```ts
import { join } from "node:path";
import { z } from "zod";

const EN_PREFIX = "3D render: ";
const BN_PREFIX = "৩ডি রেন্ডার: ";

const renderImageSchema = z.object({
  file: z.string().regex(/^[a-z0-9-]+\.jpg$/),
  altEn: z.string().max(300).refine((v) => v.startsWith(EN_PREFIX), { message: `altEn must start "${EN_PREFIX}"` }),
  altBn: z.string().max(300).refine((v) => v.startsWith(BN_PREFIX), { message: `altBn must start "${BN_PREFIX}"` }),
});
export type RenderImage = z.infer<typeof renderImageSchema>;

const projectSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    titleEn: z.string().trim().min(1).max(200),
    titleBn: z.string().trim().min(1).max(200),
    descriptionEn: z.string().refine((v) => v.includes("3D render"), { message: "say these are 3D renders" }),
    descriptionBn: z.string().refine((v) => v.includes("৩ডি রেন্ডার"), { message: "say these are ৩ডি রেন্ডার" }),
    sortOrder: z.number().int().min(0),
    cover: renderImageSchema,
    gallery: z.array(renderImageSchema).min(1).max(12),
  })
  .refine((p) => p.titleBn !== p.titleEn, { message: "titleBn must be Bangla", path: ["titleBn"] });
export type ArchitectureProject = z.infer<typeof projectSchema>;

/**
 * Design-stage projects shown in 3D renders. Every rule here exists so a
 * render cannot be published as if it were a photograph of a built house.
 */
export const architectureManifestSchema = z
  .array(projectSchema)
  .min(1)
  .refine((all) => new Set(all.map((p) => p.slug)).size === all.length, { message: "slugs must be unique" });

/** `<slug>/<file>` for every image the manifest names that is not on disk. */
export function missingRenders(manifest: ArchitectureProject[], exists: (path: string) => boolean): string[] {
  return manifest.flatMap((p) =>
    [p.cover, ...p.gallery].map((img) => join(p.slug, img.file)).filter((rel) => !exists(rel)),
  );
}
```

- [ ] **Step 4: Write the manifest** — `apps/api/prisma/seed-data/architecture.ts`:

```ts
import type { ArchitectureProject } from "../../src/content/architecture-manifest";

/**
 * Home Inn's own villa designs, from the company's renders (2026). Titles are
 * descriptive, at Muhammad's choice; location, year and client are left for
 * the admin. The images live in the gitignored `architecture_renders/<slug>/`
 * at the repo root — see handout.md for the copy step.
 */
export const architectureManifest: ArchitectureProject[] = [
  {
    slug: "brick-screen-villa",
    titleEn: "Brick-Screen Villa",
    titleBn: "ইটের জালির ভিলা",
    descriptionEn:
      "<p>A two-storey family house designed by Home Inn, shown here in 3D renders. A brick jali screen wraps the stair tower, shading it while letting light and air through; the living room opens onto the garden behind glass, and the roof becomes a terrace under a pergola.</p>",
    descriptionBn:
      "<p>হোম ইনের নকশা করা একটি দোতলা পারিবারিক বাড়ি, এখানে ৩ডি রেন্ডারে দেখানো হয়েছে। সিঁড়ির টাওয়ার ঘিরে ইটের জালি — ছায়া দেয়, আলো-বাতাস ঢুকতে দেয়; বসার ঘর কাচের ভেতর দিয়ে বাগানের দিকে খোলা, আর ছাদ পারগোলার নিচে টেরেস।</p>",
    sortOrder: 0,
    cover: { file: "front.jpg", altEn: "3D render: the front of a two-storey house, a brick jali screen over the stair tower beside a glazed living room and car porch", altBn: "৩ডি রেন্ডার: দোতলা বাড়ির সামনের দিক — সিঁড়ির টাওয়ারে ইটের জালি, পাশে কাচঘেরা বসার ঘর ও গাড়ি বারান্দা" },
    gallery: [
      { file: "gate.jpg", altEn: "3D render: the house seen through its gate and boundary wall", altBn: "৩ডি রেন্ডার: গেট ও সীমানা দেয়ালের ভেতর দিয়ে বাড়িটি" },
      { file: "street-corner.jpg", altEn: "3D render: the brick jali tower over the car porch, seen from the street corner", altBn: "৩ডি রেন্ডার: রাস্তার মোড় থেকে গাড়ি বারান্দার ওপরে ইটের জালির টাওয়ার" },
      { file: "aerial-roof-terrace.jpg", altEn: "3D render: an aerial view of the roof terrace, pergola and brick panels", altBn: "৩ডি রেন্ডার: ছাদের টেরেস, পারগোলা ও ইটের প্যানেলের ওপর থেকে দৃশ্য" },
      { file: "aerial-entrance.jpg", altEn: "3D render: an aerial view from the entrance side", altBn: "৩ডি রেন্ডার: প্রবেশপথের দিক থেকে ওপরের দৃশ্য" },
      { file: "stair-hall.jpg", altEn: "3D render: a floating stair against the brick jali wall, with an indoor tree", altBn: "৩ডি রেন্ডার: ইটের জালির দেয়ালের পাশে ঝুলন্ত সিঁড়ি, সঙ্গে ঘরের ভেতরের গাছ" },
      { file: "dining.jpg", altEn: "3D render: the dining table beside the stair, under a double-height window", altBn: "৩ডি রেন্ডার: সিঁড়ির পাশে খাবার টেবিল, ওপরে দুই তলা উঁচু জানালা" },
      { file: "living-room.jpg", altEn: "3D render: the living room, a timber TV wall facing a long sofa and a glazed corner", altBn: "৩ডি রেন্ডার: বসার ঘর — কাঠের টিভি দেয়ালের সামনে লম্বা সোফা ও কাচের কোণ" },
      { file: "bedroom.jpg", altEn: "3D render: a bedroom with a timber accent wall and a wide window", altBn: "৩ডি রেন্ডার: কাঠের অ্যাকসেন্ট দেয়াল ও চওড়া জানালাসহ শোবার ঘর" },
      { file: "cutaway-ground.jpg", altEn: "3D render: the ground floor cut away to show the rooms, car porch and garden", altBn: "৩ডি রেন্ডার: কেটে দেখানো নিচতলা — ঘর, গাড়ি বারান্দা ও বাগান" },
      { file: "cutaway-upper.jpg", altEn: "3D render: the upper floor cut away to show the bedrooms and terraces", altBn: "৩ডি রেন্ডার: কেটে দেখানো ওপরতলা — শোবার ঘর ও টেরেস" },
    ],
  },
  {
    slug: "rooftop-pool-villa",
    titleEn: "Rooftop-Pool Villa",
    titleBn: "ছাদে পুলসহ ভিলা",
    descriptionEn:
      "<p>A two-storey house designed by Home Inn, shown here in 3D renders: an arched portico and columns at the front, a jali-screened stair tower, and a swimming pool on the roof.</p>",
    descriptionBn:
      "<p>হোম ইনের নকশা করা একটি দোতলা বাড়ি, এখানে ৩ডি রেন্ডারে দেখানো হয়েছে: সামনে খিলানযুক্ত পোর্টিকো ও কলাম, জালিঘেরা সিঁড়ির টাওয়ার, আর ছাদে সুইমিং পুল।</p>",
    sortOrder: 1,
    cover: { file: "front.jpg", altEn: "3D render: the front of a two-storey house with an arched portico, columns and a car porch", altBn: "৩ডি রেন্ডার: খিলানযুক্ত পোর্টিকো, কলাম ও গাড়ি বারান্দাসহ দোতলা বাড়ির সামনের দিক" },
    gallery: [
      { file: "garden-approach.jpg", altEn: "3D render: the house from the garden path, the stair tower rising above the portico", altBn: "৩ডি রেন্ডার: বাগানের পথ থেকে বাড়িটি, পোর্টিকোর ওপরে সিঁড়ির টাওয়ার" },
      { file: "aerial-pool.jpg", altEn: "3D render: an aerial view of the rooftop pool beside the jali-screened stair tower", altBn: "৩ডি রেন্ডার: জালিঘেরা সিঁড়ির টাওয়ারের পাশে ছাদের পুল, ওপর থেকে দৃশ্য" },
      { file: "aerial-roof.jpg", altEn: "3D render: the roof from above — pool, deck and railings", altBn: "৩ডি রেন্ডার: ওপর থেকে ছাদ — পুল, ডেক ও রেলিং" },
      { file: "aerial-porch.jpg", altEn: "3D render: an aerial view over the car porch and the jali panel", altBn: "৩ডি রেন্ডার: গাড়ি বারান্দা ও জালি প্যানেলের ওপর থেকে দৃশ্য" },
      { file: "pool-deck.jpg", altEn: "3D render: the rooftop pool deck and pergola", altBn: "৩ডি রেন্ডার: ছাদের পুল ডেক ও পারগোলা" },
      { file: "living-room.jpg", altEn: "3D render: a living room with a timber TV wall, an arched window and green cushions", altBn: "৩ডি রেন্ডার: কাঠের টিভি দেয়াল, খিলান জানালা ও সবুজ কুশনসহ বসার ঘর" },
      { file: "dining-hall.jpg", altEn: "3D render: a double-height dining hall", altBn: "৩ডি রেন্ডার: দুই তলা উঁচু খাবার ঘর" },
      { file: "stair.jpg", altEn: "3D render: the stair, with a jali screen and indoor planting", altBn: "৩ডি রেন্ডার: জালির পর্দা ও ঘরের ভেতরের গাছসহ সিঁড়ি" },
      { file: "plan-view.jpg", altEn: "3D render: the ground floor seen from directly above", altBn: "৩ডি রেন্ডার: ঠিক ওপর থেকে দেখা নিচতলা" },
      { file: "cutaway-ground.jpg", altEn: "3D render: the ground floor cut away to show the rooms and garage", altBn: "৩ডি রেন্ডার: কেটে দেখানো নিচতলা — ঘর ও গ্যারেজ" },
    ],
  },
];
```

- [ ] **Step 5: Run the spec to verify it passes**

Run: `cd apps/api && pnpm jest src/content/architecture-manifest.spec.ts`
Expected: PASS (9 tests).

- [ ] **Step 6: Write the seed** — `apps/api/prisma/seed-architecture.ts`:

```ts
import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { architectureManifestSchema, missingRenders } from "../src/content/architecture-manifest";
import { MediaService } from "../src/media/media.service";
import { LocalDiskStorage } from "../src/media/storage/local-disk.storage";
import { architectureManifest } from "./seed-data/architecture";

/** Gitignored, at the repo root, like media_dump/. */
const DIR = join(__dirname, "..", "..", "..", "architecture_renders");

/**
 * Imports Home Inn's villa designs as published, featured projects under
 * Architectural Design. Idempotent on slug. It refuses to start if any render
 * is missing, rather than leave a project half-created. The brick villa's
 * front becomes the Architectural Design service's cover if it has none.
 */
export async function seedArchitecture(prisma: PrismaClient): Promise<void> {
  const manifest = architectureManifestSchema.parse(architectureManifest);
  const missing = missingRenders(manifest, (rel) => existsSync(join(DIR, rel)));
  if (missing.length > 0) {
    throw new Error(`Missing renders in architecture_renders/: ${missing.join(", ")}`);
  }

  const area = await prisma.workingArea.findUniqueOrThrow({ where: { slug: "architectural-design" } });
  const media = new MediaService(prisma as never, new LocalDiskStorage());
  const ingest = async (slug: string, img: { file: string; altEn: string; altBn: string }) =>
    media.ingest(
      { buffer: await readFile(join(DIR, slug, img.file)), mimetype: "image/jpeg", originalname: img.file },
      { altEn: img.altEn, altBn: img.altBn },
    );

  for (const project of manifest) {
    if (await prisma.project.findUnique({ where: { slug: project.slug } })) {
      console.log(`kept     ${project.slug}`);
      continue;
    }
    const cover = await ingest(project.slug, project.cover);
    const gallery = [];
    for (const img of project.gallery) gallery.push(await ingest(project.slug, img));

    await prisma.project.create({
      data: {
        slug: project.slug,
        titleEn: project.titleEn,
        titleBn: project.titleBn,
        locationEn: "",
        locationBn: "",
        descriptionEn: project.descriptionEn,
        descriptionBn: project.descriptionBn,
        workingAreaId: area.id,
        coverId: cover.id,
        gallery: { connect: gallery.map((g) => ({ id: g.id })) },
        featured: true,
        published: true,
        sortOrder: project.sortOrder,
      },
    });
    console.log(`added    ${project.slug} (cover + ${gallery.length})`);
  }

  const service = await prisma.service.findUnique({ where: { slug: "architectural-design" } });
  const brick = await prisma.project.findUnique({ where: { slug: "brick-screen-villa" } });
  if (service && !service.coverId && brick?.coverId) {
    await prisma.service.update({ where: { id: service.id }, data: { coverId: brick.coverId } });
    console.log("service  architectural-design cover set");
  }
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedArchitecture(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => void prisma.$disconnect());
}
```

Add `"seed:architecture": "tsx prisma/seed-architecture.ts",` to `apps/api/package.json` scripts, after `seed:products`. Add `architecture_renders/` to the root `.gitignore`.

- [ ] **Step 7: Typecheck and run the API suite**

Run: `cd apps/api && pnpm typecheck && pnpm jest`
Expected: clean; all suites pass.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/content/architecture-manifest.ts apps/api/src/content/architecture-manifest.spec.ts apps/api/prisma/seed-data/architecture.ts apps/api/prisma/seed-architecture.ts apps/api/package.json .gitignore
git commit -m "feat(api): import the villa designs as render projects"
```

---

### Task 4: Blueprint assets and component

**Files:**
- Create: `apps/web/public/blueprints/ground-floor.webp`, `apps/web/public/blueprints/first-floor.webp`
- Create: `apps/web/components/blueprint/blueprint.tsx`, `apps/web/components/blueprint/blueprint.test.tsx`

**Interfaces:**
- Consumes: `useReveal<T>()` from `@/hooks/use-reveal`, which returns `{ ref, revealed }` (already revealed under reduced motion).
- Produces: `Blueprint({ plan: "ground-floor" | "first-floor"; label?: string; className?: string })`.

- [ ] **Step 1: Make the assets** (from the repo root):

```bash
D="/mnt/shinrinyoku/Home Inn/PDF References/Drawings"; T=$(mktemp -d); mkdir -p apps/web/public/blueprints
for pair in "A.02 1:ground-floor" "A.03 Layout:first-floor"; do
  src="${pair%%:*}"; out="${pair##*:}"
  pdftoppm -r 150 -png -singlefile "$D/$src.pdf" "$T/$out"
  magick "$T/$out.png" -colorspace Gray -negate -fuzz 1% -trim +repage -bordercolor black -border 20 -level 4%,60% \
    -alpha copy -fill black -colorize 100 -resize 1600x -define webp:lossless=true "apps/web/public/blueprints/$out.webp"
done
magick identify apps/web/public/blueprints/*.webp
```

Expected: `ground-floor.webp 1600x1356` and `first-floor.webp 1600x1357`, ~100–130 KB each. The lines live in the alpha channel; the colour is irrelevant, because CSS paints it.

- [ ] **Step 2: Write the failing test** — `apps/web/components/blueprint/blueprint.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Blueprint } from "./blueprint";

function motion(reduced: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query.includes("reduce"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

// jsdom has no IntersectionObserver; this one reports "in view" at once.
class InView {
  constructor(private readonly cb: IntersectionObserverCallback) {}
  observe() { this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as never); }
  disconnect() {}
}

beforeEach(() => vi.stubGlobal("IntersectionObserver", InView));
afterEach(() => vi.unstubAllGlobals());

describe("Blueprint", () => {
  it("draws the named plan as a mask over the current text colour", () => {
    // currentColor is what lets the lines follow the theme.
    motion(false);
    const { container } = render(<Blueprint plan="ground-floor" />);
    const lines = container.querySelector("[data-blueprint-lines]") as HTMLElement;
    expect(lines.style.maskImage || lines.style.webkitMaskImage).toContain("/blueprints/ground-floor.webp");
    expect(lines).toHaveClass("bg-current");
  });

  it("is decorative unless it is given a label", () => {
    motion(false);
    const { container, rerender } = render(<Blueprint plan="first-floor" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    rerender(<Blueprint plan="first-floor" label="First-floor plan" />);
    expect(container.firstElementChild).toHaveAttribute("role", "img");
    expect(container.firstElementChild).toHaveAttribute("aria-label", "First-floor plan");
  });

  it("draws itself in once it is in view", () => {
    motion(false);
    const { container } = render(<Blueprint plan="ground-floor" />);
    expect(container.firstElementChild).toHaveAttribute("data-revealed", "true");
    const lines = container.querySelector("[data-blueprint-lines]") as HTMLElement;
    expect(lines.style.clipPath).toBe("inset(0px 0% 0px 0px)");
  });

  it("holds the plan's own proportions, so the page does not jump", () => {
    motion(false);
    const { container } = render(<Blueprint plan="ground-floor" />);
    expect((container.firstElementChild as HTMLElement).style.aspectRatio).toBe("1600 / 1356");
  });

  it("is complete and still under reduced motion: no wipe, no pen", () => {
    motion(true);
    vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
    const { container } = render(<Blueprint plan="ground-floor" />);
    expect(container.firstElementChild).toHaveAttribute("data-revealed", "true");
    expect(container.querySelector("[data-blueprint-pen]")).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd apps/web && pnpm vitest run components/blueprint`
Expected: FAIL — `Failed to resolve import "./blueprint"`.

- [ ] **Step 4: Implement** — `apps/web/components/blueprint/blueprint.tsx`:

```tsx
"use client";

import type { CSSProperties } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useReveal } from "@/hooks/use-reveal";

/**
 * Home Inn's own floor plans (PDF References/Drawings), rasterised once to
 * line art held in the alpha channel. The ratio is the file's own.
 */
const PLANS = {
  "ground-floor": { src: "/blueprints/ground-floor.webp", ratio: "1600 / 1356" },
  "first-floor": { src: "/blueprints/first-floor.webp", ratio: "1600 / 1357" },
} as const;

export type PlanName = keyof typeof PLANS;

/**
 * A floor plan that draws itself in, left to right, like a plotter.
 *
 * The plan is a CSS mask over `currentColor`, so its lines take the colour of
 * whatever ground it sits on and follow the theme without a second asset. The
 * reveal is one `clip-path` transition with a thin accent bar on its leading
 * edge. Under reduced motion it is simply there, complete, with no pen.
 * Decorative unless it is given a label.
 */
export function Blueprint({
  plan,
  label,
  className = "",
}: {
  plan: PlanName;
  label?: string;
  className?: string;
}) {
  const { ref, revealed } = useReveal<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();
  const { src, ratio } = PLANS[plan];
  const mask = `url(${src})`;

  const lines: CSSProperties = {
    maskImage: mask,
    WebkitMaskImage: mask,
    maskSize: "contain",
    WebkitMaskSize: "contain",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskPosition: "center",
    clipPath: revealed ? "inset(0px 0% 0px 0px)" : "inset(0px 100% 0px 0px)",
  };

  return (
    <div
      ref={ref}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-revealed={revealed}
      className={`relative ${className}`}
      style={{ aspectRatio: ratio }}
    >
      <div
        data-blueprint-lines
        className="absolute inset-0 bg-current motion-safe:transition-[clip-path] motion-safe:duration-[2400ms] motion-safe:ease-in-out"
        style={lines}
      />
      {reduced ? null : (
        <span
          data-blueprint-pen
          aria-hidden="true"
          className="absolute inset-y-0 w-px bg-accent transition-[left,opacity] duration-[2400ms] ease-in-out"
          style={{ left: revealed ? "100%" : "0%", opacity: revealed ? 0 : 1 }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd apps/web && pnpm vitest run components/blueprint && pnpm typecheck && pnpm lint`
Expected: PASS (5 tests); typecheck and lint clean.

- [ ] **Step 6: Commit**

```bash
git add apps/web/public/blueprints apps/web/components/blueprint
git commit -m "feat(web): add a self-drawing blueprint from the company's floor plans"
```

---

### Task 5: The design-process section

**Files:**
- Create: `apps/web/public/process/model-640.webp`, `model-1280.webp`, `render-960.webp`, `render-1600.webp`
- Modify: `apps/web/components/sections/process.tsx`, `apps/web/components/sections/process.test.tsx`
- Modify: `apps/web/messages/en.json`, `apps/web/messages/bn.json` (`home.process*`)

**Interfaces:**
- Consumes: `Blueprint` (Task 4); `Section` (`eyebrow`, `title`, `tone`); `renderWithIntl`.
- Produces: `Process()`, which takes no props and is already placed in `app/[locale]/page.tsx`.

- [ ] **Step 1: Make the images** (from the repo root):

```bash
V="/mnt/shinrinyoku/Home Inn/PDF References/Variations"; mkdir -p apps/web/public/process
for w in 640 1280; do magick "$V/try 4.JPG" -resize ${w}x -quality 82 apps/web/public/process/model-$w.webp; done
# The PromeAI mark sits in the bottom band (y ≈ 3280–3460 of 3640): crop it off, don't paint it over.
for w in 960 1600; do magick "$V/2 (7).JPG" -crop 5504x3240+0+0 +repage -resize ${w}x -quality 82 apps/web/public/process/render-$w.webp; done
magick identify apps/web/public/process/*.webp
```

Open `render-1600.webp` and confirm that no trace of "PromeAI" remains. Expected sizes: model 1280×854 and render 1600×942.

- [ ] **Step 2: Write the failing test** — replace `apps/web/components/sections/process.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { Process } from "./process";

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
});

describe("Process", () => {
  it("shows plan, model and render, in that order", () => {
    renderWithIntl(<Process />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent))
      .toEqual(["Plan", "Model", "Render"]);
  });

  it("draws the plan as a labelled blueprint", () => {
    renderWithIntl(<Process />);
    expect(screen.getByRole("img", { name: /Ground-floor plan/ })).toBeInTheDocument();
  });

  it("calls the render a render, so it is never taken for a photograph", () => {
    renderWithIntl(<Process />);
    expect(screen.getByAltText(/^3D render:/)).toHaveAttribute("src", "/process/render-1600.webp");
  });

  it("serves the model and render at more than one width", () => {
    renderWithIntl(<Process />);
    expect(screen.getByAltText(/3D massing model/)).toHaveAttribute("srcset", "/process/model-640.webp 640w, /process/model-1280.webp 1280w");
  });

  it("speaks Bangla on bn pages", () => {
    renderWithIntl(<Process />, { locale: "bn" });
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent))
      .toEqual(["প্ল্যান", "মডেল", "রেন্ডার"]);
    expect(screen.getByAltText(/^৩ডি রেন্ডার:/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd apps/web && pnpm vitest run components/sections/process.test.tsx`
Expected: FAIL — `Process` still renders nothing (`processTitle` is empty).

- [ ] **Step 4: Write the copy.** In `apps/web/messages/en.json`, under `home`, replace `processEyebrow` and `processTitle` and add the rest:

```json
"processEyebrow": "How a design develops",
"processTitle": "From the first line to the finished view.",
"processPlanTitle": "Plan",
"processPlanBody": "Measured floor plans: every room, wall and door, and the way you move between them.",
"processPlanAlt": "Ground-floor plan of a house, with rooms, furniture and a two-car garage",
"processModelTitle": "Model",
"processModelBody": "The plan built up in 3D, so the massing and the light can be judged before anything is built.",
"processModelAlt": "A 3D massing model of a modern duplex, with boxed balconies",
"processRenderTitle": "Render",
"processRenderBody": "The same model rendered as it will look, close enough to decide on.",
"processRenderAlt": "3D render: the same duplex finished in white plaster and timber, at dusk",
```

In `apps/web/messages/bn.json`, under `home`:

```json
"processEyebrow": "নকশা যেভাবে এগোয়",
"processTitle": "প্রথম রেখা থেকে চূড়ান্ত দৃশ্য পর্যন্ত।",
"processPlanTitle": "প্ল্যান",
"processPlanBody": "মাপসহ ফ্লোর প্ল্যান: প্রতিটি ঘর, দেয়াল ও দরজা, আর এক ঘর থেকে অন্য ঘরে যাওয়ার পথ।",
"processPlanAlt": "একটি বাড়ির নিচতলার প্ল্যান — ঘর, আসবাব ও দুই গাড়ির গ্যারেজ",
"processModelTitle": "মডেল",
"processModelBody": "প্ল্যান থেকে ৩ডি মডেল, যাতে নির্মাণের আগেই আকার ও আলো বিচার করা যায়।",
"processModelAlt": "আধুনিক ডুপ্লেক্সের ৩ডি মডেল, বাক্স-আকৃতির বারান্দাসহ",
"processRenderTitle": "রেন্ডার",
"processRenderBody": "সেই মডেলই চূড়ান্ত চেহারায় রেন্ডার — সিদ্ধান্ত নেওয়ার মতো যথেষ্ট বাস্তব।",
"processRenderAlt": "৩ডি রেন্ডার: সাদা প্লাস্টার ও কাঠে সম্পূর্ণ সেই ডুপ্লেক্স, সন্ধ্যায়",
```

- [ ] **Step 5: Implement** — replace `apps/web/components/sections/process.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { Blueprint } from "@/components/blueprint/blueprint";
import { Section } from "./section";

/** Static section imagery from Home Inn's own design study (PDF References/Variations). */
const IMAGES = {
  model: { widths: [640, 1280], width: 1280, height: 854 },
  render: { widths: [960, 1600], width: 1600, height: 942 },
} as const;

function StepImage({ name, alt }: { name: keyof typeof IMAGES; alt: string }) {
  const { widths, width, height } = IMAGES[name];
  const largest = widths[widths.length - 1];
  return (
    <img
      src={`/process/${name}-${largest}.webp`}
      srcSet={widths.map((w) => `/process/${name}-${w}.webp ${w}w`).join(", ")}
      sizes="(min-width: 1024px) 30vw, 100vw"
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className="aspect-[3/2] w-full object-cover"
    />
  );
}

/**
 * How a Home Inn design develops, shown with the company's own material. The
 * model and the render are the same duplex; the plan is a different house and
 * the copy does not claim otherwise.
 */
export function Process() {
  const t = useTranslations("home");

  const steps = [
    {
      key: "plan",
      media: (
        <div className="flex aspect-[3/2] items-center justify-center bg-ink-raised p-6 text-sand/80">
          <Blueprint plan="ground-floor" label={t("processPlanAlt")} className="h-full max-w-full" />
        </div>
      ),
    },
    { key: "model", media: <StepImage name="model" alt={t("processModelAlt")} /> },
    { key: "render", media: <StepImage name="render" alt={t("processRenderAlt")} /> },
  ] as const;

  return (
    <Section eyebrow={t("processEyebrow")} title={t("processTitle")} tone="ink">
      <ol className="grid gap-10 lg:grid-cols-3">
        {steps.map((step) => {
          const name = `${step.key.charAt(0).toUpperCase()}${step.key.slice(1)}` as "Plan" | "Model" | "Render";
          return (
            <li key={step.key}>
              {step.media}
              <h3 className="heading mt-6">{t(`process${name}Title`)}</h3>
              <p className="mt-2 text-sand-dim">{t(`process${name}Body`)}</p>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd apps/web && pnpm vitest run && pnpm typecheck && pnpm lint`
Expected: PASS, including `messages.test.ts` (key parity, no half-translated keys).

- [ ] **Step 7: Commit**

```bash
git add apps/web/public/process apps/web/components/sections/process.tsx apps/web/components/sections/process.test.tsx apps/web/messages
git commit -m "feat(web): show how a design develops — plan, model, render"
```

---

### Task 6: Blueprints in place, and the empty facts row

**Files:**
- Modify: `apps/web/components/sections/statement.tsx`, `apps/web/components/sections/statement.test.tsx`
- Modify: `apps/web/app/[locale]/services/[slug]/page.tsx`
- Modify: `apps/web/app/[locale]/projects/[slug]/page.tsx`

**Interfaces:**
- Consumes: `Blueprint` (Task 4).
- Produces: nothing new.

- [ ] **Step 1: Write the failing test** — add to `apps/web/components/sections/statement.test.tsx`. Add `vi`, `beforeEach` to the vitest import, and add this `beforeEach` at the top of the file:

```tsx
beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
});
```

Then the case:

```tsx
  it("lays a faint first-floor plan behind the statement, hidden from assistive technology", () => {
    const { container } = renderWithIntl(<Statement locale="en" settings={settingsFixture} />);
    const plan = container.querySelector("[data-blueprint-lines]")?.parentElement;
    expect(plan).toHaveAttribute("aria-hidden", "true");
    expect((plan?.querySelector("[data-blueprint-lines]") as HTMLElement).style.maskImage)
      .toContain("first-floor");
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/web && pnpm vitest run components/sections/statement.test.tsx`
Expected: FAIL — no `[data-blueprint-lines]`.

- [ ] **Step 3: Implement the Statement backdrop.** In `statement.tsx`:

- Import `Blueprint` from `@/components/blueprint/blueprint`.
- Wrap the Section's children in `<div className="relative">`, and place this as the first child:

```tsx
        {/* Decorative: a faint first-floor plan behind the copy, wide screens only. */}
        <Blueprint
          plan="first-floor"
          className="pointer-events-none absolute -right-10 -top-6 hidden w-[36rem] text-ink/[0.07] lg:block"
        />
```

- Give the existing three `<p>` elements `relative` so they stack above it.

- [ ] **Step 4: Place a blueprint on the service page.** In `services/[slug]/page.tsx`:

- Import `Blueprint`.
- Add above the component: `const DRAWN = new Set(["architectural-design"]); // services that show a plan`.
- Directly after the `<RichText …/>` element, inside the same grid column, add:

```tsx
          {DRAWN.has(slug) ? (
            <Blueprint plan="ground-floor" className="mt-12 max-w-xl text-ink/30" />
          ) : null}
```

The column must stay one element. Wrap `<RichText>` and the blueprint in a `<div>` and move RichText's `className` layout (`max-w-2xl space-y-4 …`) onto the RichText itself, unchanged.

- [ ] **Step 5: Hide the facts row when it is empty.** In `projects/[slug]/page.tsx`, wrap the `<dl …>` in `{facts.length > 0 ? ( … ) : null}`. Both villas have no location, year, area or client, and today they would get an empty bordered box.

- [ ] **Step 6: Run the tests and checks**

Run: `cd apps/web && pnpm vitest run && pnpm typecheck && pnpm lint`
Expected: PASS and clean.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/sections/statement.tsx apps/web/components/sections/statement.test.tsx "apps/web/app/[locale]/services/[slug]/page.tsx" "apps/web/app/[locale]/projects/[slug]/page.tsx"
git commit -m "feat(web): set blueprints behind the statement and on the design service"
```

---

### Task 7: Apply, verify, record

**Files:**
- Modify: `handout.md`

- [ ] **Step 1: Copy the renders into the gitignored folder** (from the repo root):

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
ls $A/* | wc -l   # 26 lines: 2 headers + 22 files + 2 blanks
git status --short | grep architecture_renders || echo "ignored — good"
```

- [ ] **Step 2: Seed the dev database**

```bash
cd apps/api && set -a && . ../../.env && set +a
pnpm seed               # adds the service and working area, shifts sort orders
pnpm seed:architecture  # added brick-screen-villa (cover + 10), rooftop-pool-villa (cover + 10), service cover set
pnpm seed:architecture  # second run: "kept" twice, nothing added
```

- [ ] **Step 3: Rebuild and restart the web app.** Stop whatever serves :3100 first.

```bash
cd ../.. && set -a && . ./.env && set +a && rm -rf apps/web/.next && pnpm --filter @homeinn/web build && test -f apps/web/.next/BUILD_ID
PORT=3100 pnpm --filter @homeinn/web start   # in the background
```

- [ ] **Step 4: Verify in a browser**, using the scratchpad scripts (Brave via Playwright):
  - axe WCAG 2.1 AA on `/`, `/services`, `/services/architectural-design`, `/projects`, `/projects/brick-screen-villa` and `/projects?area=architectural-design`, en and bn, both themes. Expect 0 violations.
  - Screenshots, checked by eye:
    - the process section in both themes: the plan draws in, and its lines are visible on each ground
    - the statement backdrop: faint, behind the text, not over it
    - the two villa project pages: no empty facts box, and alt text starts "3D render:"
    - the service page cover and plan
    - the projects filter: "Architectural Design" comes first

- [ ] **Step 5: Run every suite**

Run: `pnpm typecheck && pnpm test && pnpm lint && (cd apps/api && pnpm test:e2e)`
Expected: clean and green.

- [ ] **Step 6: Record in `handout.md`.** Write a "Part 2 — built" entry that lists the files per task and the verification results. Include:
  - the render-copy step (Step 1), since the folder is gitignored
  - a correction: the floor plan reads **2,814.19 sq ft**, not 2,614 as noted earlier
  - the PromeAI crop

- [ ] **Step 7: Commit and push**

```bash
git add handout.md && git commit -m "docs: record the architecture remodel"
git push git@github.com:Danial-Dirar/homeinn-interior.git main:main
git fetch git@github.com:Danial-Dirar/homeinn-interior.git main:refs/remotes/origin/main
```
