# Prompt — sort the Home Inn photo/video archive

Copy everything below the line into your AI agent (Antigravity or similar) on
the machine that holds the photos. It is self-contained: it does not need this
repository, a database, or any of our code. Its only job is to turn a messy
folder into a folder the importer here can read.

Point it at the archive folder, then bring back **the whole sorted folder plus
`manifest.json`**.

---

## Your task

You are sorting a photo and video archive for **Home Inn Interior Solution**, an
interior design, custom furniture and project-implementation company that has
operated in Bangladesh since 2015. These are photographs of their completed
work. The output feeds a website that is already built, so the structure below
is a contract, not a suggestion.

You will be given one folder. It may be organised, half-organised, or a single
flat dump of thousands of files. Reorganise it into the layout in **§3** and
write a `manifest.json` as specified in **§5**.

## 1. The one rule that overrides everything

**Never invent a fact.** This company's site is built under a strict
honest-content rule: nothing is published that the company has not actually
stated or done.

You may record what you can *see* in a photograph — that a room is a kitchen,
that a space is an office, that cabinetry is dark wood. You may **not** record,
guess, or infer:

- client names, company names, or people's names
- the year a project was completed
- floor area, budget, or duration
- the neighbourhood or district, **unless** it is written in the source filename
  or folder name

If you don't know something, leave the field `null`. A `null` is correct and
useful. A guess is a defect that will end up on a public website as a false
claim. Never fill a field to make the manifest look complete.

Do not rename anything in a way that asserts a fact. `dhaka-office/` is only
acceptable if the source said Dhaka.

## 2. The nine categories

Every project folder must be assigned exactly one of these nine. Use the slug
verbatim — spelling, hyphens and all. These are fixed in the database and an
unrecognised value will fail the import.

| Slug (use this) | What it means |
|---|---|
| `corporate-office-bank-furniture` | Offices, banks, workstations, conference rooms, reception desks |
| `home-furniture-interior-exterior` | Private homes and flats — living rooms, bedrooms, kitchens, home exteriors |
| `resort-eco-resort-five-star-hotel` | Resorts, eco-resorts, hotels, guest rooms, lobbies |
| `duplex-triplex-construction` | Multi-storey private residences, internal staircases connecting floors |
| `showroom-outlet` | Retail showrooms and outlets, product display, retail counters |
| `industrial-building-steel-structure` | Factories, warehouses, steel-frame buildings, industrial sheds |
| `landscaping` | Gardens, rooftop gardens, outdoor planting, terraces, courtyards |
| `gypsum-work` | False ceilings, gypsum partitions, cornice and ceiling detail work |
| `govt-project-work` | Government offices and departments, public hospitals, public institutes |

Notes on judging:

- Judge by the **space**, not the furniture. A desk in a hospital admin room is
  `govt-project-work`, not `corporate-office-bank-furniture`.
- If a folder plainly covers two categories, pick the dominant one and put the
  alternative in `category_alternative` in the manifest. Do not split one real
  project across two folders.
- If you genuinely cannot tell, use `null` and place the folder under
  `_unsorted/`. That is a correct answer — a human will decide.

## 3. Output folder structure

```
sorted/
  projects/
    <category-slug>/
      <project-folder-name>/
        cover.jpg              ← the single best wide shot (see §4)
        01-<short-hint>.jpg    ← gallery, numbered in the order to display
        02-<short-hint>.jpg
        ...
  hero/
    01-<room>.jpg              ← see §6, this is the important one
    02-<room>.jpg
    ...
  video/
    <original-name>.mp4        ← see §7, do not re-encode
  _unsorted/                   ← category unclear, or you are unsure it is Home Inn's work
  _rejected/
    too-small/                 ← under 1440px wide
    duplicates/                ← near-identical to a file you kept
    unusable/                  ← blurry, dark, motion-blurred, accidental shots
  manifest.json
```

Rules for names:

- **Folder and file names:** lowercase, hyphens only, ASCII, no spaces, no
  Bangla, no `#`, `&`, `(`, `)`, or apostrophes. A leading `-` is forbidden.
- `<project-folder-name>` becomes the project's title on the website, so make it
  descriptive of the *space*, not of a client you are guessing at:
  `mirpur-office-fitout`, `rooftop-garden-uttara`, `duplex-staircase-gulshan`.
  If the source folder already had a sensible name, keep it.
- `<short-hint>` is 1–3 words describing the shot: `01-reception.jpg`,
  `02-conference-room.jpg`, `03-ceiling-detail.jpg`.
- **Never delete anything.** Move rejects into `_rejected/`, do not remove them.
- Keep the original file extension. Do not convert or re-compress (except §8).

## 4. Choosing images

Minimum sizes — these come from the site's asset spec:

| Use | Minimum width | Notes |
|---|---|---|
| `cover.jpg` | 1440px | landscape strongly preferred, roughly 3:2 |
| gallery | 1440px | portrait is fine here |
| `hero/` | **1920px** | must be landscape, roughly 16:9 |

Anything narrower than 1440px goes to `_rejected/too-small/`.

Pick per project:

- **cover:** the widest, best-lit, most complete view of the finished space. It
  is the one image that represents the whole project on a grid.
- **gallery:** 6–10 images. Prefer variety — a wide shot, a mid shot, a detail.
  Drop near-duplicates (five frames of the same corner: keep the sharpest, move
  the rest to `_rejected/duplicates/`).
- Reject: blurry, badly under- or over-exposed, mid-construction shots with
  visible rubble or tools, anything with people's faces clearly identifiable,
  screenshots, documents, and photos of paper drawings.

**Faces:** if a photo shows an identifiable person, move it to
`_rejected/unusable/` and note it. This company's site deliberately does not
publish identifiable individuals without consent.

## 5. `manifest.json`

Write one file at the root of `sorted/`. Exact shape:

```json
{
  "generated": "2026-08-07",
  "source_folder": "<what you were given>",
  "totals": { "kept": 0, "rejected": 0, "unsorted": 0, "videos": 0 },
  "projects": [
    {
      "folder": "mirpur-office-fitout",
      "category": "corporate-office-bank-furniture",
      "category_alternative": null,
      "confidence": "high",
      "cover": "cover.jpg",
      "gallery": ["01-reception.jpg", "02-workstations.jpg"],
      "location_from_source": "Mirpur",
      "year_from_source": null,
      "notes": "Folder name in the source said 'mirpur office'. No year anywhere.",
      "visible_content": ["reception desk", "open-plan workstations", "false ceiling"]
    }
  ],
  "hero_candidates": {
    "chosen_set": ["01-living.jpg", "02-dining.jpg"],
    "same_property": true,
    "reasoning": "All six frames are the same flat, shot in one session — consistent daylight."
  },
  "videos": [
    {
      "file": "walkthrough.mp4",
      "seconds": 42,
      "resolution": "1920x1080",
      "has_audio": true,
      "loops_cleanly": false,
      "content": "Slow walk through a finished flat, living room to kitchen."
    }
  ],
  "rejected": [
    { "file": "IMG_2231.jpg", "reason": "too-small", "detail": "1024x768" }
  ],
  "unsorted": [
    { "folder": "misc-2019", "reason": "Mixed office and home shots, cannot separate confidently." }
  ]
}
```

`confidence` is `"high"`, `"medium"` or `"low"` — your certainty about the
**category**, not the image quality. Be honest; `"low"` tells a human where to
look first.

`location_from_source` and `year_from_source` must be `null` unless the value
was literally written in a source filename, folder name, or an accompanying
text file. Do not read it off a signboard in a photo and treat it as fact —
if you do that, say so explicitly in `notes`.

## 6. The hero set — the highest-value part of this job

The website opens with a full-screen sequence that pans horizontally through
what should read as **one continuous interior**. Getting this right matters more
than any single project folder.

Find **six landscape photographs, at least 1920px wide, of the same property,
shot in one session** — ideally room to room in the order you would walk
through: living → dining → kitchen → bedroom, and so on.

What makes the set work:

- **Same property, same day.** Mixing two flats breaks the illusion instantly.
- **Consistent light.** Same time of day, same white balance. A warm evening
  shot next to a cool midday shot reads as a mistake.
- **Consistent height and framing.** All shot from roughly eye level.
- **Spatial logic.** Kitchen straight into a bathroom breaks it; living into
  dining works.

Number them `01-` … `06-` **in walking order, not in quality order.**

If no property has six suitable frames, take the best sequence you can find —
three or four is still usable — and say so plainly in `hero_candidates.reasoning`.
If nothing qualifies, leave `hero/` empty and explain why. An empty `hero/` is a
correct outcome; a stitched-together fake sequence is not.

## 7. Video

The website does not support video yet — the decision on how it will be used is
still open. So **do not transcode, trim, or re-encode anything.** Just:

1. Copy every video into `video/` with its original name (cleaned to lowercase
   hyphens, no leading dash).
2. Describe each one in the manifest: duration, resolution, whether it has
   audio, whether the first and last frames are similar enough that it could
   loop seamlessly, and one sentence on what it shows.
3. Flag any clip that is a steady, well-lit walk through a finished space —
   those are the useful ones.

## 8. HEIC, RAW and phone formats

If you find `.heic`, `.heif`, `.dng`, `.cr2`, `.nef` or `.arw` files, convert a
copy to high-quality JPEG (quality 90+, full resolution, no resizing) and keep
**both**: the JPEG in the sorted structure, the original under
`_rejected/../originals/`. Note the conversion in the manifest. Standard image
tooling cannot read these formats, which is the only reason to convert.

## 9. Before you finish

Check each of these and report the result:

- [ ] Every project folder has exactly one `cover.jpg`.
- [ ] Every `category` is one of the nine slugs, spelled exactly, or `null`.
- [ ] No filename contains a space, a Bangla character, or a leading `-`.
- [ ] Nothing was deleted — rejects were moved, not removed.
- [ ] No `year`, `location`, area or client name was filled in from a guess.
- [ ] `manifest.json` parses as valid JSON.
- [ ] Totals in the manifest match the actual file counts.

Then report: how many projects, how many per category, how many rejected and
why, whether a usable hero set was found, and the three things you were least
certain about.
