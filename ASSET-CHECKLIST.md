# Asset checklist

Every image slot the site has, and whether it is filled. Spec §15.

Stand-ins are free-licence and every one records its source and licence below.
A slot with no row is an empty slot — the site is built to render without it,
not to break.

**The single highest-value ask of the client:** good photographs or renders of
their own finished work. The hero is currently stock (see below); the
company's own photography or architectural renders should replace it the day
they are good enough.

| Slot | Needed | Have | Spec | Notes |
|---|---|---|---|---|
| Hero segments | 6 | 6 **stand-ins** | ≥1920 wide, landscape, homes and offices that look like Bangladesh | Unsplash, listed below. Manifest: `apps/api/prisma/seed-data/hero/hero.ts`; apply with `pnpm --filter @homeinn/api seed:hero` |
| Hero foregrounds | — | — | — | Not used: the hero is a crossfade of whole frames, not a stitched pan |
| Logo | 1 | done | — | `assets/` — "Home inn" wordmark in Righteous, set as live text by `components/brand/wordmark.tsx` |
| Favicon / app icon | 1 | done | — | `apps/web/app/icon.png`, `apple-icon.png`, from the square profile mark |
| OG image | 1 | done | 1200×630 | `apps/web/public/og.png`, the cream logo on cream |
| Service covers | 6 | 0 | 1440×960 | One per seeded service |
| Project covers + galleries | per project | 25 projects | 1440 wide minimum | The company's own archive (`media_dump/`), imported by `seed:projects`; titles are provisional |
| Furniture | per piece | 6 | — | The company's own archive, `seed:products`; prices are placeholders |
| Client logos | as permitted | 3 | — | `client_logos/`, `seed:logos` — confirmed clients only |
| Team photos | as available | 0 | 800×800 | Team seeds empty and the section hides (spec §12) |
| Credential scans | 3 | 0 | trade license, VAT, TIN | Inside the profile PDF |

## Blocked on the company profile PDF

The PDF is not in this repository. Until it lands, the following stay empty and
their sections hide rather than render invented content (spec §12):

- 73 corporate and 57 residential client rows — `apps/api/prisma/seed-data/`
- Vision / Mission / Values / Strengths / Philosophy copy — `apps/web/messages/*.json`
- The six key strengths behind the "How we work" section — `home.processTitle`
- Service descriptive copy — currently restates each title and claims nothing more

## Per-file licence record

The Unsplash License allows free commercial use with no attribution required;
it does not allow selling the photos unaltered or compiling them into a
competing service. Attribution is recorded here anyway, so every stand-in is
traceable. None of these photographs is Home Inn's work, and the hero labels
name kinds of space, never projects.

| File | Source | Photographer | Taken in | Licence | Added |
|---|---|---|---|---|---|
| `apps/api/prisma/seed-data/hero/architecture.jpg` | https://unsplash.com/photos/hmlP-v0vJ5o | Elite Prop (@elite_prop19) | Madurai, India | Unsplash License | 2026-10-12 |
| `apps/api/prisma/seed-data/hero/drawing-room.jpg` | https://unsplash.com/photos/c14mTWtAKAQ | Sanju Pandita (@spxclicks) | — | Unsplash License | 2026-10-12 |
| `apps/api/prisma/seed-data/hero/lounge.jpg` | https://unsplash.com/photos/p2oz7Bkk5t4 | Jejo Jose (@tomjejojose) | — | Unsplash License | 2026-10-12 |
| `apps/api/prisma/seed-data/hero/kitchen.jpg` | https://unsplash.com/photos/OVQqxYg3Az8 | SD Inc (@sdincseo) | New Delhi, India | Unsplash License | 2026-10-12 |
| `apps/api/prisma/seed-data/hero/bedroom.jpg` | https://unsplash.com/photos/mfFyocD9ttI | Anisha Deb (@newleafdesigns) | Pune, India | Unsplash License | 2026-10-12 |
| `apps/api/prisma/seed-data/hero/office.jpg` | https://unsplash.com/photos/eSKkEgvhq_I | PYX Photography (@pyx_photo) | New Delhi, India | Unsplash License | 2026-10-12 |

Each photo page was opened in a browser on 2026-10-12 and read "Free to use
under the Unsplash License"; none is Unsplash+. These replaced a first set the
same day (Michael Brown, Gaurav Kumar, Clay Banks ×2, Poojan Thanekar, Caroline
Badran), which read as American houses — those files are no longer in the repo.
