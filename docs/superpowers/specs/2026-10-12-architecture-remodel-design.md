# Architecture remodel — design

Part 2 of the brand refresh. Written 2026-10-12, approved in chat the same day.

## The problem

Home Inn now does "everything starting from architecture design", but the site
introduces itself as interiors and furniture. The company's own architecture
work — two villa designs in 3D renders, floor plans, and a duplex design study
— appears nowhere.

## Decisions already made

- The hero stays as it is: six licensed stand-in photographs.
- All of `/mnt/shinrinyoku/Home Inn/PDF References/` is Home Inn's own work
  and may be published, **except** `16.09/Reference/`, which by its name holds
  other people's villas.
- The villas get descriptive titles. Location, year and client stay empty for
  the admin to fill in later.
- The floor plans belong to no known project and are used as drawings in
  their own right.
- A "Plan → Model → Render" section goes on the home page, with the plan
  drawing itself.
- The duplex render's PromeAI watermark may be removed. It is **cropped out**,
  not painted over.

## Honesty rules this design keeps

- A render is never presented as a photograph of a built place. Project
  descriptions say "design, shown in 3D renders", and every alt text begins
  "3D render:".
- Design-stage projects get their own working area, so a renders-only project
  is never filed beside built work.
- No new count appears in copy. Stale counts such as "Nine kinds" and "Six
  ways" are removed rather than updated, so they cannot go stale again.
- Captions for the plan, model and render say what each one is. They do not
  claim the plan belongs to the same house as the model.

## Content and data

| Change | Where |
| --- | --- |
| Service **Architectural Design / স্থাপত্য নকশা**, first (`sortOrder` 0, others shifted), icon `drafting-compass`, cover = the brick villa's front render | `seed-data/services.ts`, `lib/icons.ts`, the architecture seed |
| Working area **Architectural Design / স্থাপত্য নকশা**, first (others shifted) | `seed-data/working-areas.ts` |
| Project **Brick-Screen Villa / ইটের জালির ভিলা** — ~10 renders from `Renders 2/` | the architecture seed |
| Project **Rooftop-Pool Villa / ছাদে পুলসহ ভিলা** — ~10 renders from `16.09/`, 1920px only; not `output_0*`, the Wix file or `Reference/` | the architecture seed |
| Both projects published and featured, so they lead "Selected projects" | the architecture seed |

**The architecture seed** (`prisma/seed-architecture.ts`,
`pnpm seed:architecture`):

- It is manifest-driven, like the hero. `seed-data/architecture.ts` lists each
  project's slug, titles, descriptions, cover, gallery and per-image alt text.
- The images are read from a **gitignored** `architecture_renders/` at the repo
  root, copied there from the reference folder, so ~40 MB of renders stay out
  of git — the same pattern as `media_dump/`.
- It is idempotent on slug. A zod schema rejects alt text that does not begin
  with "3D render" / "৩ডি রেন্ডার", an empty Bangla field, and a missing file.

## Copy (en and bn)

- `home.statementTitle` → "Architecture, interiors and custom furniture —
  designed and built across Bangladesh."
- `seo.defaultTitle` / `defaultDescription` and `about.storyBody` add
  architecture. `home.heroFallbackTitle` gets the same treatment.
- `home.areasTitle`, `home.servicesTitle` and `services.intro` lose their
  counts.

## Home: the design-process section

`Process` currently renders nothing, because its copy is blocked on the profile
PDF. It becomes this section: an eyebrow, a title, and three panels.

1. **Plan** — the ground-floor plan (A.02) as a `Blueprint`. It draws itself
   in when scrolled into view.
2. **Model** — a SketchUp massing study of the duplex (`Variations/try*.JPG`).
3. **Render** — the PromeAI render of the same duplex (`Variations/2 (7).JPG`,
   5504px), with the watermark band cropped off.

Images 2 and 3 are static assets in `apps/web/public/process/`, as WebP at 960
and 1600 wide, rendered with `srcset`. They are fixed section imagery, not
CMS content.

## Blueprints

- **`Blueprint`** (`components/blueprint/blueprint.tsx`) draws a floor plan.
  - The PDF is rasterised once (`pdftoppm`) to a transparent line-art WebP in
    `public/blueprints/`.
  - It is used as a CSS `mask-image` over `background-color: currentColor`, so
    the lines take the theme's colour.
  - On reveal, a `clip-path` wipe draws it left to right like a plotter, with
    a thin accent bar on the leading edge.
  - Under reduced motion it renders complete and static. It is `aria-hidden`
    when decorative, and has a label when it is content (the Plan panel).
- **Placements:**
  - the Process Plan panel — content
  - behind the Statement, the first-floor plan (A.03) at low opacity —
    decorative
  - the Architectural Design service page — decorative

## Not changed

The hero, nav, footer and theme. A dedicated `/architecture` page is a
possible later step, not part of this.

## Testing

- **Unit:** `Blueprint` — mask URL, reveal class, reduced-motion static,
  decorative versus labelled. `Process` — three panels, captions and alt text
  in both languages. The architecture manifest schema. Icon mapping. Message
  parity. And the "no count in copy" guard: `areasTitle`, `servicesTitle` and
  `services.intro` contain no digits and no number word (en: one to twelve;
  bn: এক to বারো, and Bangla digits).
- **e2e:** the seed is idempotent. The service and working area exist and
  come first. `seed.e2e-spec.ts` counts become 7 services and 11 working
  areas.
- **axe** on the home, services, the architecture service page and projects,
  in both themes and both locales. Screenshots checked by eye.
