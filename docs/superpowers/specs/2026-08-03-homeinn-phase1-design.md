# Home Inn Interior Solution — Phase 1 Design

**Date:** 2026-08-03
**Phase:** 1 of 3 — Foundation + Marketing Site
**Status:** Awaiting review

---

## 1. Context

Home Inn Interior Solution is an interior design, custom furniture, and project
implementation company operating in Bangladesh since 2015. It has no website.
Its entire web presence is a Facebook page with 178 followers, which badly
under-represents a company holding 73 completed corporate projects, government
contracts, and countrywide reach.

The company's real asset is its track record. The site's primary job is to make
that track record legible to a prospective client within thirty seconds.

### Reference material reviewed

| Source | What it gave us |
|---|---|
| Company Profile PDF (2026) | Authoritative business facts — clients, products, working areas, credentials, history |
| Facebook page `/homeinnbd14` | Contact details, logo, brand colours, Bangla slogan |
| `interiorstudiobd.com` | Competitor IA — cost estimator, bilingual blog, process page |
| `bdinterior.net` | Competitor IA — deep portfolio taxonomy, video gallery, free-consultancy CTA |
| YouTube Short (ICG Gallery) | Motion reference — scroll-driven horizontal camera dolly through a continuous interior |

The Facebook page and YouTube video could not be fetched programmatically
(both block unauthenticated scraping). Their content reached us as user-supplied
screenshots, which is why the motion model below is derived from six sampled
frames rather than the source video.

---

## 2. Business facts — source of truth

These values seed `SiteSettings` and the client tables. **Nothing in this section
is invented.** Everything traces to the company profile PDF or the Facebook page.

**Identity**
- Legal / brand name: **Home Inn Interior Solution**
- English tagline: **touch your dream with us** (present in the logo lockup)
- Bangla slogan: **আপনার স্বপ্ন ছোঁয়া আমাদের স্পর্শ**
- Bangla welcome line: আসসালামুআলাইকুম, আমাদের Home Inn Interior Solution পরিবারে আপনাকে স্বাগতম।
- Established **2015**
- Operates under trade license of **M/S Ahasan Enterprise**
- Logo: circular mark, house/roof outline, red `H` + grey `i`, wordmark `HOMEINN`

**Contact**
- Address: Plot# 18, Road# 03, Block# KHA, Section# 06, Mirpur-10, Dhaka-1216
- Phone / WhatsApp: 01760-775454 / +880 1760 775454
- Email: homeinnbd14@gmail.com
- Instagram: `@homeinnbd` · Facebook: `/homeinnbd14`
- Intended domain: `homeinnbd.com` (currently does not resolve)
- Hours: "Always open" per Facebook; profile PDF gives no hours

**Credentials**
- Trade license (via M/S Ahasan Enterprise)
- VAT registration, BIN **001489494-0804**
- TIN certificate

**Services / Products (7, verbatim from profile)**
1. Home Furniture & Office Furniture Supply (Customized Design)
2. Interior Design & Implementation
3. Exterior Design & Implementation
4. 2D Plan & Solution
5. 3D Model & Visualization
6. All Thai Work Implementation
7. Home Appliance (Kitchen Accessories, Bathroom Accessories & All Items)

**Working Areas (9, verbatim) — used as the portfolio taxonomy**
Corporate Office & Bank Furniture · Home Furniture, Interior & Exterior ·
Resort, Eco-Resort & Five Star Hotel · Duplex & Triplex Construction ·
Showroom Outlet · Industrial Building Steel Structure · Landscaping ·
Gypsum Work · Govt. Project Work

**Track record**
- 73 corporate project entries
- 57 residential project entries
- "40s Apartments" furniture supply, interior design & decoration
- Districts touched: Dhaka, Savar, Narayanganj, Gopalganj, Barishal, Chittagong,
  Rangpur, Sylhet, Tangail, Manikganj, Narshingdi, Noakhali, Natore

**Counting rule.** The corporate list contains repeat clients across different
sites (Multiple Health Pharma appears four times — head office, second office,
factory, warehouse; Asia Sourcing appears three times). We therefore publish
**"73 corporate projects"**, never "73 clients". This is accurate, avoids a
deduplication judgment call, and is the stronger claim anyway.

Residential rows 17 and 33 are unreadable in the PDF text layer. They are seeded
as-is with a `needsVerification` flag rather than guessed at.

**Flagship references worth surfacing** (credibility, not vanity):
BFIDC · CMH Dermatology Department, Dhaka Cantonment · Department of Narcotics ·
Gulshan & Khilgaon Zone Sub-Register Offices · Prime Medical College & Hospital ·
Mohila Polytechnic Institute · Woodora Furniture Ltd.

**Vision / Mission / Values / Strengths / Philosophy** — five blocks of copy exist
verbatim in the profile. They are reproduced with light editing for grammar
(the source has ESL constructions like "our field forces are enough expects")
but no change of meaning or claim.

---

## 3. Scope

### In scope (Phase 1)

Bilingual marketing site + CMS + lead capture.

### Explicitly out of scope

| Deferred to | What |
|---|---|
| Phase 2 | Cart, checkout, bKash/SSLCommerz, inventory, orders, customer accounts |
| Phase 3 | Cost estimator, video gallery, e-book capture, reviews, analytics dashboards |

Phase 1 schema is designed so Phase 2 is **additive**: a new `ShopProduct` table
(SKU, price, stock, variants) hanging off the existing `Service` as its category,
plus `Cart` / `Order` / `Payment`. No Phase 1 table is restructured or migrated.

Note that a shoppable item is not the same thing as a service. Service #7,
"Home Appliance (Kitchen Accessories, Bathroom Accessories & All Items)", is a
*category* — the individual taps and cabinet handles that sell at a fixed price
are its children. Collapsing SKUs into the `Service` row would force exactly the
migration this phasing exists to avoid.

**Hard external dependency for Phase 2:** bKash merchant and SSLCommerz store
credentials require the client's business documents. Phase 2 will be built and
tested against SSLCommerz sandbox; going live is an environment-variable change.
The client should begin the bKash merchant application before Phase 2 starts.

---

## 4. Architecture

```
homeinn/
├─ apps/
│  ├─ web/     Next.js 15 App Router — public site + /admin
│  └─ api/     NestJS 11 — REST, Prisma, PostgreSQL
└─ packages/
   ├─ ui/      shared shadcn components + motion primitives
   ├─ types/   Zod schemas → shared DTOs
   └─ config/  tsconfig / eslint / tailwind preset
```

pnpm workspaces + Turborepo.

**Boundary.** NestJS owns data, auth, and business rules and knows nothing about
presentation. Next.js owns rendering and routing and never touches Postgres
directly. The API is independently testable with supertest; a future mobile app
or Facebook catalog sync plugs into the same surface.

**Admin lives at `apps/web/app/[locale]/admin/*`** — a Next.js route group, not a
third app. Two deploys instead of three, one design system, and the CMS inherits
Next's image pipeline.

**Zod as the contract.** `packages/types` exports Zod schemas. The API validates
requests with them via a `ZodValidationPipe`; the web app infers TypeScript types
from the same schemas. A field rename breaks the build on both sides at once,
which is the point.

**Auth.** JWT access (15 min) + refresh (7 d) in httpOnly, SameSite=Lax cookies.
argon2id password hashing. Refresh-token rotation with reuse detection. Roles:
`ADMIN` (everything) and `EDITOR` (content only, no user management). No
third-party auth service — one or two accounts does not justify the dependency.

**Media.** Upload → `sharp` → responsive AVIF + WebP variants at 480/960/1440/1920,
plus a blurhash placeholder, behind a `StorageService` interface. `LocalDiskStorage`
to start; swapping in S3/R2 is one class with no call-site changes.

**Rate limiting.** `@nestjs/throttler` on all public write endpoints — lead
submission capped at 5/hour/IP, login at 5/15min/IP.

---

## 5. Data model

Prisma, PostgreSQL. Every user-facing text field exists as `<name>En` and
`<name>Bn`.

```prisma
// ---------- Content ----------

model Service {              // the 7 "products" from the profile
  id            String   @id @default(cuid())
  slug          String   @unique
  titleEn       String
  titleBn       String
  summaryEn     String
  summaryBn     String
  bodyEn        String   @db.Text     // rich text (HTML from editor)
  bodyBn        String   @db.Text
  icon          String                // lucide icon name
  coverId       String?
  cover         Media?   @relation(fields: [coverId], references: [id])
  gallery       Media[]  @relation("ServiceGallery")
  sortOrder     Int      @default(0)
  published     Boolean  @default(false)
  seo           Seo?
  // Phase 2 hangs ShopProduct[] off this row; the row itself does not change.
}

model WorkingArea {          // the 9 areas — portfolio taxonomy
  id         String    @id @default(cuid())
  slug       String    @unique
  nameEn     String
  nameBn     String
  sortOrder  Int       @default(0)
  projects   Project[]
}

model Project {
  id             String       @id @default(cuid())
  slug           String       @unique
  titleEn        String
  titleBn        String
  clientName     String?                    // nullable — residential clients may not consent
  locationEn     String
  locationBn     String
  areaSqft       Int?
  year           Int?
  descriptionEn  String       @db.Text
  descriptionBn  String       @db.Text
  workingAreaId  String
  workingArea    WorkingArea  @relation(fields: [workingAreaId], references: [id])
  coverId        String?
  cover          Media?       @relation(fields: [coverId], references: [id])
  gallery        Media[]      @relation("ProjectGallery")
  featured       Boolean      @default(false)
  published      Boolean      @default(false)
  sortOrder      Int          @default(0)
  seo            Seo?
}

model CorporateClient {
  id                String   @id @default(cuid())
  serial            Int                    // preserve profile ordering
  companyName       String
  address           String
  isFlagship        Boolean  @default(false)
  needsVerification Boolean  @default(false)
}

model ResidentialClient {
  id                String   @id @default(cuid())
  serial            Int
  clientName        String
  address           String
  needsVerification Boolean  @default(false)
  // displayed only with consent; see §11 privacy note
  publiclyListed    Boolean  @default(false)
}

model Certification {
  id         String  @id @default(cuid())
  titleEn    String
  titleBn    String
  issuer     String?
  reference  String?              // e.g. BIN 001489494-0804
  documentId String?
  document   Media?  @relation(fields: [documentId], references: [id])
  sortOrder  Int     @default(0)
}

model HeroSegment {             // drives the scroll panorama — see §7
  id            String  @id @default(cuid())
  sortOrder     Int
  imageId       String
  image         Media   @relation("HeroBg", fields: [imageId], references: [id])
  foregroundId  String?                     // parallax layer that hides the joint
  foreground    Media?  @relation("HeroFg", fields: [foregroundId], references: [id])
  labelEn       String                      // "Living Room"
  labelBn       String
  captionEn     String?
  captionBn     String?
  focalX        Float   @default(0.5)       // 0–1, keeps the subject framed on crop
  active        Boolean @default(true)
  showOnMobile  Boolean @default(false)      // see §7: mobile renders this subset
}

model BlogPost {
  id           String    @id @default(cuid())
  slug         String    @unique
  titleEn      String
  titleBn      String
  excerptEn    String
  excerptBn    String
  bodyEn       String    @db.Text
  bodyBn       String    @db.Text
  coverId      String?
  cover        Media?    @relation(fields: [coverId], references: [id])
  tags         String[]
  published    Boolean   @default(false)
  publishedAt  DateTime?
  seo          Seo?
}

model Testimonial {
  id         String  @id @default(cuid())
  authorName String
  roleEn     String?
  roleBn     String?
  quoteEn    String
  quoteBn    String
  rating     Int?    // 1–5
  avatarId   String?
  avatar     Media?  @relation(fields: [avatarId], references: [id])
  published  Boolean @default(false)
  sortOrder  Int     @default(0)
}

model TeamMember {
  id        String  @id @default(cuid())
  name      String
  roleEn    String
  roleBn    String
  bioEn     String?
  bioBn     String?
  photoId   String?
  photo     Media?  @relation(fields: [photoId], references: [id])
  sortOrder Int     @default(0)
  published Boolean @default(false)
}

// ---------- Leads ----------

enum LeadType    { CONTACT CONSULTATION QUOTE }
enum LeadStatus  { NEW CONTACTED QUALIFIED WON LOST }

model Lead {
  id            String     @id @default(cuid())
  type          LeadType
  status        LeadStatus @default(NEW)
  name          String
  phone         String
  email         String?
  message       String?    @db.Text
  serviceId     String?                     // "I'm interested in X"
  service       Service?   @relation(fields: [serviceId], references: [id])
  sourcePath    String?                     // which page it came from
  locale        String                      // en | bn
  internalNotes String?    @db.Text
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  @@index([status, createdAt])
}

// ---------- Infrastructure ----------

model Media {
  id          String  @id @default(cuid())
  storageKey  String                        // opaque to callers
  mimeType    String
  width       Int
  height      Int
  bytes       Int
  blurhash    String?
  altEn       String                        // required — enforced at API layer
  altBn       String
  createdAt   DateTime @default(now())
}

model Seo {
  id             String  @id @default(cuid())
  titleEn        String?
  titleBn        String?
  descriptionEn  String?
  descriptionBn  String?
  ogImageId      String?
  ogImage        Media?  @relation(fields: [ogImageId], references: [id])
}

model SiteSettings {          // single row, id = "singleton"
  id             String  @id @default("singleton")
  phone          String
  whatsapp       String
  email          String
  addressEn      String
  addressBn      String
  hoursEn        String
  hoursBn        String
  facebookUrl    String?
  instagramUrl   String?
  youtubeUrl     String?
  establishedYear Int
  // headline stats, editable so they stay true as work is added
  corporateProjectCount   Int
  residentialProjectCount Int
  districtCount           Int
}

enum Role { ADMIN EDITOR }

model AdminUser {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role     @default(EDITOR)
  createdAt    DateTime @default(now())
}

model RefreshToken {
  id         String   @id @default(cuid())
  userId     String
  tokenHash  String   @unique
  expiresAt  DateTime
  revokedAt  DateTime?
  replacedBy String?
}
```

**Why `Media` is its own table.** Alt text is a required, bilingual, per-image
property. Storing image references as bare strings on each model would either
duplicate alt text everywhere or lose it. A first-class `Media` row also makes
the "which images still need replacing" query trivial once the client's real
photos arrive.

---

## 6. Information architecture

```
/[locale]
  /                    Home
  /about               story · vision · mission · values · strengths ·
                       philosophy · credentials · team
  /services            the 7 services
  /services/[slug]     service detail
  /projects            portfolio, filtered by the 9 working areas
  /projects/[slug]     case study
  /clients             corporate + residential track record
  /blog
  /blog/[slug]
  /contact
  /admin/*             CMS (auth-gated)
```

Working areas are a **filter dimension on `/projects`**, not their own page —
they describe the same projects from a different angle, and a nine-item nav
section would dilute the four things a visitor actually needs.

Credentials fold into `/about` rather than standing alone; a trade-license page
nobody links to is dead weight, but a licensed-and-VAT-registered block inside
the About story does real trust work.

### Home page sections, in order

1. **Scroll panorama hero** (pinned) — brand mark, tagline, scroll cue
2. **Statement** — since 2015, countrywide, with the three headline stats
3. **What we do** — 7 services
4. **Where we work** — 9 working areas
5. **Selected projects** — 4 featured
6. **Track record** — flagship client names + link to `/clients`
7. **How we work** — process derived from the six key strengths
8. **Testimonials** — *hidden when empty* (see §12)
9. **Credentials** — licensed, VAT registered, since 2015
10. **CTA** — free consultation form + WhatsApp
11. Footer

### Global nav

`Home · About · Services · Projects · Clients · Blog · Contact` + language toggle
+ a persistent WhatsApp affordance. Nav is thin, near-transparent over the hero,
and gains a background on scroll.

---

## 7. The scroll panorama hero

The signature element. Derived from the ICG Gallery reference: **vertical scroll
drives a horizontal camera dolly through what reads as one continuous interior.**
Rooms flow into each other; there are no slide transitions.

### Structure

```
<section aria-label="…" style="height: 500vh">      ← scroll distance
  <div class="sticky top-0 h-dvh overflow-hidden">
    <div class="strip" style="width: calc(N * 100vw)">   ← translateX
       segment 1 … segment N        (background layer)
    </div>
    <div class="foreground">        ← same X, higher rate  (parallax)
    <div class="lightpool">         ← radial gradient, follows camera
    <div class="labels">            ← room names, crossfaded
    <div class="progress">          ← hairline + room ticks
  </div>
</section>
```

### Mechanics

- `p` = pin progress, 0 → 1, from GSAP ScrollTrigger
- `strip.x = -p * (stripWidth - viewportWidth)`
- Each segment is `100vw`, image `object-fit: cover`, positioned by `focalX` so
  the subject survives any viewport aspect ratio
- **Seam hiding** — the whole trick. Each joint gets two treatments stacked:
  a `mask-image: linear-gradient(to right, transparent, black 12%, black 88%, transparent)`
  on adjacent segment edges, and a foreground element (column, curtain, plant)
  straddling the joint at ~1.35× the strip's translate rate. The eye reads the
  faster-moving object as near-field depth and stops looking for the seam.
- **Light pool** — a radial gradient overlay whose centre tracks `p`, warm amber,
  low opacity. This is what produces the ICG "spotlit" feel; without it stitched
  stock photos read as a flat filmstrip.
- **Labels** — each segment owns a `[start, end]` window of `p`; opacity and a
  small `y` translate crossfade room names in and out.

### Responsive & degraded behaviour

| Condition | Behaviour |
|---|---|
| Desktop | all `active` segments (6 seeded), 500vh scroll distance |
| Mobile (< 768px) | only segments with `showOnMobile` (3 seeded), 300vh, narrower crops via `focalX` |
| `prefers-reduced-motion` | **No pin, no transform.** Renders as a normal vertical stack of the room images with their labels. Same content, ordinary scroll. |
| JS disabled | Server-rendered fallback: first segment as a static hero image + heading |

The mobile subset is curated in the CMS, not sampled automatically — dropping
every other segment breaks the spatial logic of the pan (you end up travelling
from a kitchen straight into a bathroom). The editor picks the three that still
read as one walk through a flat.

### Performance budget

- Segment images: AVIF, 1920px wide, **≤ 180 KB each** → ≤ 1.1 MB for six
- Segment 1 is the LCP element: `priority`, preloaded, blurhash placeholder
- Segments 3+ lazy-load on scroll proximity via `IntersectionObserver`
- `will-change: transform` applied only while pinned, removed on unpin
- Target: LCP < 2.5 s on a mid-range Android over 4G

### Accessibility

Room labels are real DOM text, not baked into images. The section carries an
`aria-label`. Pinning never traps keyboard focus — it is scroll-driven only, and
a skip link jumps past it. The reduced-motion path is a first-class layout, not
an afterthought.

### Isolation

The hero is a self-contained component taking `segments: HeroSegment[]`. It knows
nothing about the CMS or the rest of the page. Give it one segment and it renders
a static hero; give it a true wide panorama later and the same component pans it
seamlessly. This is what keeps the "stitched strip now, real panorama later"
upgrade path open without an abstraction layer we'd have to maintain.

---

## 8. Visual design

### Direction

Cinematic and quiet. Near-black grounds, warm amber light pools, sand and walnut
neutrals — the ICG reference's restraint — with Home Inn's red used as a scalpel,
never as a wash. The competitors' sites are bright, dense, and busy; the whole
competitive advantage here is looking like the client can afford good taste.

### Palette

| Token | Value | Use |
|---|---|---|
| `ink` | `#0B0B0C` | immersive section ground |
| `ink-raised` | `#141416` | cards on dark |
| `ink-line` | `#232326` | hairlines |
| `bone` | `#F6F2EC` | light section ground |
| `sand` | `#E7DFD2` | primary text on dark |
| `sand-dim` | `#9C948A` | secondary text |
| `walnut` | `#7A5537` | warm structural accent |
| `amber` | `#C9A227` | light-pool glow only |
| `brand` | `#E01B24` | **CTA, active nav, focus ring, section numerals — nothing else** |

**Not dark end-to-end.** Immersive sections (hero, projects, CTA) sit on `ink`;
content-dense surfaces (service detail, blog body, the 130-row client tables,
contact) sit on `bone`. An all-dark site makes a long client table unreadable and
turns the blog into a chore. The alternation also gives the page a spine.

### Typography

- **Display:** Fraunces (variable, optical size axis) — warm, high-contrast serif
- **Body / UI:** Geist Sans
- **Bangla:** Anek Bangla (variable), fallback Noto Sans Bengali

Bangla and Latin do not share an x-height. The type scale carries a per-locale
adjustment — Bangla headings render at ~0.94× the Latin size with looser leading —
so a `bn` page has the same optical weight as its `en` counterpart rather than
looking shouty. This is applied once in the Tailwind preset, not per component.

### Motion

Lenis for smooth scroll, GSAP ScrollTrigger for the pinned hero, Framer Motion
for component-level entrances. Every one of them gated behind a single
`useReducedMotion` check — motion is a progressive enhancement, not a dependency.

### Component sourcing

shadcn/ui for the primitives (button, dialog, form, sheet, tabs, table, toast).
21st.dev registry for the higher-order marketing blocks worth not hand-rolling —
marquee, animated testimonial carousel, bento grid, image comparison slider.
Both install through the shadcn CLI into `packages/ui`, so everything lands as
editable source in the repo rather than as a runtime dependency.

---

## 9. Internationalisation

`next-intl`, routes `/en/*` and `/bn/*`, `en` as default with `localeDetection`
against the `Accept-Language` header. Locale is a route segment, so every page is
statically renderable per language and independently indexable.

UI chrome strings live in `messages/{en,bn}.json`. Content strings live in the
database as `*En` / `*Bn` column pairs. The admin editor shows both languages
side by side and blocks publish when the active locale's required fields are
empty — the failure mode we are designing against is a `bn` page that silently
falls back to English.

`hreflang` alternates on every page; `bn` gets `lang="bn"` and the Bangla font
stack from the server, avoiding a flash of Latin fallback.

---

## 10. Admin CMS

Route group `/[locale]/admin`, middleware-gated on a valid session.

- **Dashboard** — new leads, unpublished drafts, missing-alt-text count
- **Leads** — table with status pipeline, filters, internal notes, CSV export
- **Content** — Services, Projects, Working Areas, Blog, Testimonials, Team
- **Track record** — Corporate / Residential client tables, inline edit, CSV import
- **Hero** — reorder segments, swap images, set `focalX` with a live preview
- **Media** — library, upload, bilingual alt text (required), usage lookup
- **Settings** — contact details, socials, headline stats
- **Users** — ADMIN only

Every list view is server-paginated. The hero editor previews the actual pan so
the client can judge a seam before publishing, which is the one place a wrong
image choice is expensive to discover later.

---

## 11. SEO, privacy, and legal

- Per-page metadata from the `Seo` model, falling back to sensible derivations
- `LocalBusiness` + `Organization` JSON-LD with the real NAP; `BreadcrumbList`;
  `Article` on blog posts
- `sitemap.xml` and `robots.txt` generated from published content, both locales
- OpenGraph images per page

**Residential client privacy.** The profile PDF lists 57 named individuals with
their neighbourhoods — including doctors, professors, and a brigadier. Publishing
named private individuals with location data is a real exposure, and consent for
a PDF sent to a corporate prospect is not consent for a public web page. So:

- `ResidentialClient.publiclyListed` defaults to **false**
- The public `/clients` page shows residential work **aggregated** — count,
  districts, project types — with no names
- Corporate entities are published by name; a company name and office address is
  ordinary commercial reference material
- If the client later obtains individual consent, flipping `publiclyListed`
  surfaces a name. That is their decision to make, deliberately, per person.

---

## 12. Honest-content rules

The site must not manufacture credibility the company has not earned.

- **Testimonials:** none exist (Facebook shows a single review). The model and
  section are built; the table seeds **empty**; the section **does not render**
  when empty. No invented quotes, no stock-photo customers.
- **Team:** seeds empty, section hidden until real people are added.
- **Stats:** only the three counts that trace to the profile document.
- **Project case studies:** seeded from the client tables as titles, locations,
  and working areas — all verifiable. Descriptive copy is marked `published: false`
  until the client confirms details.
- **Copy edits:** the profile's Vision/Mission/Values/Strengths are reproduced with
  grammar corrections only. No claim is strengthened, softened, or added.

---

## 13. Testing

Test-driven throughout — tests precede implementation for each unit.

**API (`apps/api`)**
- Unit: Jest on services with the Prisma client mocked — lead validation, slug
  generation, refresh-token rotation and reuse detection, publish-gating rules
- Integration: supertest against a real Postgres, migrated per run — every
  endpoint's auth boundary, both roles, plus the throttler limits. The dev
  machine has no Docker and no passwordless sudo, so the test database is a
  **project-local, user-owned cluster** at `.pgdata` on port 5433, started with
  `pg_ctl` (see §14). This is real PostgreSQL 18, not an emulation, so there is
  no dev/prod engine divergence — only the process supervisor differs.
- Contract: every DTO round-trips through its Zod schema

**Web (`apps/web`)**
- Unit: Vitest + React Testing Library on logic-bearing components — the hero's
  progress→transform math is a pure function and is tested as one, independently
  of the DOM
- E2E: Playwright on the flows that cost money if broken —
  submit a lead in both locales · admin login, edit, publish, verify public page ·
  locale switch preserves the current route · reduced-motion renders the stacked
  hero · 404 and error boundaries
- Accessibility: `axe-core` in Playwright on every top-level route, both locales
- Visual: Playwright screenshots on the hero at five scroll positions, so a seam
  regression fails CI rather than shipping

**What we deliberately do not test:** shadcn primitives we did not write, and
Prisma's own query behaviour.

---

## 14. Deployment

**Assumption, stated for correction:** a single VPS running Docker Compose —
Next.js, NestJS, Postgres, and Caddy for TLS — is the recommendation. It is the
cheapest option that keeps the database next to the API, avoids cross-region
latency on every CMS read, and is the easiest thing to hand to a Bangladeshi
client's own hosting provider later. Vercel + a managed Postgres is the
alternative if the client prefers zero server administration; the code does not
change either way.

**Local development does not use Docker.** The dev machine (CachyOS) has neither
Docker nor podman, and no passwordless sudo, so containers are not an option
here. Instead:

```
pnpm db:init    # initdb -D .pgdata   (once)
pnpm db:start   # pg_ctl -D .pgdata -o "-p 5433" start
pnpm db:stop
```

The cluster lives inside the repo, is owned by the developer, is gitignored, and
touches no system service. It requires the `postgresql` package for the server
binaries (`initdb`, `pg_ctl`) — the machine ships only `postgresql-libs` by
default, so this is a one-time `sudo pacman -S postgresql`.

Production still deploys as Docker Compose on the VPS; that host has Docker.
The version floor is pinned to PostgreSQL 18 in both places so the engine matches.

- Postgres backed up nightly to object storage, restore verified before launch
- GitHub Actions: lint → typecheck → unit → integration → e2e → build
- Migrations run as a release step, never at container boot
- Uploaded media on a mounted volume, excluded from image builds

---

## 15. Asset checklist

The site is built photo-agnostic with curated free-licence placeholders
(Unsplash / Pexels, licences recorded per file). `ASSET-CHECKLIST.md` at the repo
root tracks every slot; each placeholder `Media` row is flagged so the admin
dashboard can count what remains.

| Slot | Count | Spec |
|---|---|---|
| Hero segments — background | 6 | 1920×1080 AVIF, ≤180 KB, consistent colour temperature |
| Hero segments — foreground | 6 | transparent PNG/WebP, column / plant / curtain |
| Service covers | 7 | 1440×960 |
| Project covers | 12+ | 1440×960 |
| Project galleries | 6–10 each | 1920×1280 |
| Logo | 1 | SVG preferred; currently only a raster Facebook avatar |
| Team photos | as available | 800×800 |
| Credential scans | 3 | trade license, VAT, TIN — already in the profile PDF |
| OG image | 1 | 1200×630 |

**The single highest-value ask of the client:** six photographs of one completed
flat, shot in sequence room to room at a consistent time of day. That one set
converts the hero from a convincing composite into the company's actual work,
and it costs them an afternoon.

---

## 16. Open questions

None blocking. Two to resolve before launch, neither of which changes the build:

1. **Hosting** — VPS vs Vercel. Assumption above; the client's preference wins.
2. **Domain** — `homeinnbd.com` does not currently resolve. Confirm the registrar
   and whether it is owned before DNS is scheduled.

---

## 17. Next step

`superpowers:writing-plans` → phased implementation plan for Phase 1.
