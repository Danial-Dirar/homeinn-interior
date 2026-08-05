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
| Hero segments — background | 6 | 0 | 1920×1080, ≤180 KB AVIF, consistent colour temperature | Drop files in `apps/api/prisma/seed-data/placeholders/`, then `pnpm --filter @homeinn/api seed:hero` |
| Hero segments — foreground | 6 | 0 | transparent PNG/WebP — column, plant, curtain | Optional; the strip renders without them, with only the mask hiding each seam |
| Service covers | 7 | 0 | 1440×960 | One per seeded service |
| Project covers | 12+ | 0 | 1440×960 | Blocked with the project rows — see below |
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
