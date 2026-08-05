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
English label into both columns so the not-null constraint holds, and never
presents that copy as a translation.
